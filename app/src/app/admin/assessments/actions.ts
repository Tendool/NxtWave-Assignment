"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { aiEnabled } from "@/lib/ai";
import { generateAssessment } from "@/lib/assessment-gen";
import { MAX_VARIANTS, type Policy } from "@/lib/challenge-types";
import { checkUpload } from "@/lib/uploads";
import { clearHumanScore, createAssessment, deleteAssessment, poolTitles, saveHumanScore, savePolicy, scoreSubmission, setAssessmentActive } from "@/db/challenge";

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}

const req = z.enum(["required", "optional", "off"]);
const requirements = z.object({ code: req, hosted: req, video: req });
const duration = z.coerce.number().int().min(5).max(600);

// ───────────── write or upload one ─────────────

export type CreateState = { ok?: boolean; error?: string; id?: string };

export async function createManual(_p: CreateState, formData: FormData): Promise<CreateState> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  let brief = String(formData.get("brief") ?? "").trim();

  // An uploaded .md/.txt becomes the question text.
  const textFile = formData.get("briefFile");
  if (textFile instanceof File && textFile.size > 0) {
    if (!/\.(md|txt)$/i.test(textFile.name)) return { error: "Question file must be .md or .txt. For a PDF, attach it below and paste the key text above." };
    if (textFile.size > 200_000) return { error: "Question file is too large (200 KB max)." };
    brief = (await textFile.text()).trim();
  }
  if (title.length < 3) return { error: "Give it a title." };
  if (brief.length < 40) return { error: "The question needs some text — type it, or upload a .md/.txt file." };

  const r = requirements.safeParse({ code: formData.get("req_code"), hosted: formData.get("req_hosted"), video: formData.get("req_video") });
  const d = duration.safeParse(formData.get("duration"));
  if (!r.success || !d.success) return { error: "Check the requirements and duration." };

  let attachment = null;
  const att = formData.get("attachment");
  if (att instanceof File && att.size > 0) {
    const data = Buffer.from(await att.arrayBuffer());
    const c = checkUpload("attachment", att.name, data);
    if (!c.ok) return { error: c.error };
    attachment = { filename: att.name, mime: c.mime, data };
  }

  const id = await createAssessment({
    title: title.slice(0, 120),
    brief: brief.slice(0, 20_000),
    source: textFile instanceof File && textFile.size > 0 ? "upload" : "manual",
    requirements: r.data,
    durationMinutes: d.data,
    attachment,
  });
  revalidatePath("/admin/assessments");
  return { ok: true, id };
}

// ───────────── generate with the configured model ─────────────

const genSchema = z.object({
  topic: z.string().trim().min(3).max(300),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  durationMinutes: duration,
  requirements,
  index: z.number().int().min(1).max(MAX_VARIANTS),
  total: z.number().int().min(1).max(MAX_VARIANTS),
  seed: z.number().int().min(0).max(1_000_000),
});

/**
 * Generates and saves ONE variant. The client calls this N times, so each request is short enough
 * for serverless time limits and one failure doesn't throw away the others.
 */
export async function generateVariant(input: unknown): Promise<{ ok: boolean; title?: string; error?: string }> {
  await requireAdmin();
  const v = genSchema.safeParse(input);
  if (!v.success) return { ok: false, error: "Check the topic and numbers." };
  if (!(await aiEnabled())) return { ok: false, error: "AI is switched off. Turn on a model in AI settings first." };

  const g = await generateAssessment({
    topic: v.data.topic,
    difficulty: v.data.difficulty,
    durationMinutes: v.data.durationMinutes,
    requirements: v.data.requirements,
    variant: v.data.total > 1 ? { index: v.data.index, total: v.data.total, seed: v.data.seed } : undefined,
    avoidTitles: await poolTitles(),
  });
  if (!g) return { ok: false, error: "The model didn't return a usable challenge. Try again, or use a larger model." };

  await createAssessment({
    title: g.title,
    brief: g.brief,
    topic: v.data.topic,
    source: "ai",
    requirements: v.data.requirements,
    durationMinutes: v.data.durationMinutes,
  });
  revalidatePath("/admin/assessments");
  return { ok: true, title: g.title };
}

// ───────────── assignment policy ─────────────

const policySchema = z.object({
  mode: z.enum(["pool", "per_student"]),
  topic: z.string().trim().min(3).max(300),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  durationMinutes: duration,
  requirements,
  showScores: z.boolean(),
});

export async function savePolicyAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const p = policySchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Check the policy fields." };
  if (p.data.mode === "per_student" && !(await aiEnabled())) {
    return { ok: false, error: "“Unique per student” needs an AI model. Turn one on in AI settings first." };
  }
  await savePolicy(p.data as Policy);
  revalidatePath("/admin/assessments");
  return { ok: true };
}

// ───────────── manage ─────────────

export async function toggleActive(id: string, active: boolean) {
  await requireAdmin();
  await setAssessmentActive(id, active);
  revalidatePath("/admin/assessments");
}

export async function removeAssessment(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const ok = await deleteAssessment(id);
  revalidatePath("/admin/assessments");
  return ok ? { ok: true } : { ok: false, error: "Students already have this one, so it can't be deleted. Deactivate it instead." };
}

// ───────────── human override ─────────────

const uuid = z.string().regex(/^[0-9a-f-]{36}$/i);

export async function saveHuman(submissionId: string, scores: Record<string, number>, note: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!uuid.safeParse(submissionId).success) return { ok: false, error: "Bad id." };
  await saveHumanScore(submissionId, scores, String(note ?? ""));
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function clearHuman(submissionId: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!uuid.safeParse(submissionId).success) return { ok: false };
  await clearHumanScore(submissionId);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function rescore(submissionId: string) {
  await requireAdmin();
  await scoreSubmission(submissionId);
  revalidatePath("/admin/submissions", "layout");
  revalidatePath("/admin/scores");
}
