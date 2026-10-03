"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ensureShareSlug, getStudentByToken, logShare, recoverAccessToken, scoreSubmission, startAttempt, submitAttempt } from "@/db/challenge";
import { getStudentToken, setStudentToken } from "@/lib/student-session";
import { SHARE_IDS } from "@/lib/share";
import { checkUpload } from "@/lib/uploads";

async function me() {
  return getStudentByToken(await getStudentToken());
}

export async function startChallenge(): Promise<{ ok: boolean; error?: string }> {
  const student = await me();
  if (!student) return { ok: false, error: "Open this on the device you registered from, or use 'Find my challenge'." };
  const r = await startAttempt(student.id);
  revalidatePath("/challenge");
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

/** The student chooses to share their result. Creates the public card id; nothing is public before this. */
export async function createProofCard(): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const student = await me();
  if (!student) return { ok: false, error: "Open this on the device you registered from." };
  const slug = await ensureShareSlug(student.id);
  return slug ? { ok: true, slug } : { ok: false, error: "Your work needs to be scored first." };
}

export async function recordShare(channel: string): Promise<void> {
  const id = channel.startsWith("proof:") ? channel.slice(6) : channel;
  if (!SHARE_IDS.includes(id)) return;
  const student = await me();
  if (student) await logShare(student.id, channel);
}

// ───────────── find my challenge (new device) ─────────────

export type RecoverState = { error?: string };

export async function recover(_p: RecoverState, formData: FormData): Promise<RecoverState> {
  const email = z.string().trim().toLowerCase().pipe(z.email()).safeParse(formData.get("email"));
  const phone = String(formData.get("whatsapp") ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  if (!email.success || !/^[6-9]\d{9}$/.test(phone)) return { error: "Enter the email and WhatsApp number you registered with." };
  const token = await recoverAccessToken(email.data, phone);
  // Same message either way, so this can't be used to find out who is registered.
  if (!token) return { error: "We couldn't match both of those to a registration." };
  await setStudentToken(token);
  redirect("/challenge");
}

// ───────────── submit ─────────────

const url = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? null : v))
  .pipe(z.url({ protocol: /^https?$/, error: "Use a full link starting with https://" }).nullable());

const fields = z.object({ repo: url, hosted: url, video: url, notes: z.string().trim().max(2000) });

export type SubmitState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

type Upload = { filename: string; mime: string; data: Buffer };

async function readFile(fd: FormData, name: string, kind: "zip" | "video"): Promise<{ file: Upload | null } | { error: string }> {
  const f = fd.get(name);
  if (!(f instanceof File) || f.size === 0) return { file: null };
  const data = Buffer.from(await f.arrayBuffer());
  const c = checkUpload(kind, f.name, data);
  if (!c.ok) return { error: c.error };
  return { file: { filename: f.name, mime: c.mime, data } };
}

export async function submitChallenge(_p: SubmitState, formData: FormData): Promise<SubmitState> {
  const student = await me();
  if (!student) return { error: "Your session expired. Open the challenge page again." };

  const parsed = fields.safeParse({ repo: formData.get("repo") ?? "", hosted: formData.get("hosted") ?? "", video: formData.get("video") ?? "", notes: formData.get("notes") ?? "" });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { fieldErrors };
  }

  const zip = await readFile(formData, "zip", "zip");
  if ("error" in zip) return { fieldErrors: { zip: zip.error } };
  const videoFile = await readFile(formData, "videoFile", "video");
  if ("error" in videoFile) return { fieldErrors: { videoFile: videoFile.error } };

  const d = parsed.data;
  const r = await submitAttempt(student.id, {
    repoUrl: d.repo,
    hostedUrl: d.hosted,
    videoUrl: d.video,
    notes: d.notes || null,
    zip: zip.file,
    videoFile: videoFile.file,
  });
  if (!r.ok) return { error: r.error };

  // Scoring can take a while with a local model; do it after the student has their confirmation.
  after(() => scoreSubmission(r.submissionId));
  revalidatePath("/challenge");
  return { ok: true };
}
