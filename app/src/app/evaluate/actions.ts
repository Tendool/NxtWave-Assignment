"use server";

import { z } from "zod";
import { evaluationsForUrl, insertEvaluation } from "@/db/queries";
import { evaluate, gatherEvidence, type EvalResult } from "@/lib/evaluate";
import { hit, limitByIp, waitText } from "@/db/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  ref_code: z.string().trim().max(20).optional(),
  project_url: z.url({ protocol: /^https?$/, error: "Enter the full project link, starting with https://" }),
  repo_url: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/i.test(v), "Use a GitHub repo link like https://github.com/you/project"),
  description: z.string().trim().min(20, "Tell us what it does in at least a sentence").max(1200),
});

export type EvaluateState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  result?: EvalResult & { id: string };
  values?: Record<string, string>;
};

export async function submitProject(_prev: EvaluateState, formData: FormData): Promise<EvaluateState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { fieldErrors, values: raw };
  }
  const d = parsed.data;

  // Each evaluation calls an LLM and fetches external pages. Cap it per IP, and overall per day so a script
  // varying the link can't burn through the model's free quota before the real submissions arrive.
  const mine = await limitByIp("evaluate", 5, 60 * 60);
  if (!mine.ok) return { error: `You've submitted several projects already. Try again in ${waitText(mine.retryAfterSec)}.`, values: raw };
  const all = await hit("evaluate:all", 400, 24 * 60 * 60);
  if (!all.ok) return { error: "The evaluator has hit today's limit. Please try again tomorrow.", values: raw };

  // Don't let one link be spammed either.
  const prior = await evaluationsForUrl(d.project_url);
  if (prior >= 3) return { error: "This project has already been evaluated 3 times. Improve it and submit a new link.", values: raw };

  const evidence = await gatherEvidence(d.project_url, d.repo_url || null, d.description);
  const result = await evaluate(evidence);

  const saved = await insertEvaluation({
    refCode: d.ref_code?.toUpperCase() || null,
    name: d.name,
    projectUrl: d.project_url,
    repoUrl: d.repo_url || null,
    description: d.description,
    scores: result.scores,
    total: result.total,
    mode: result.mode,
    feedback: result.feedback,
  });
  return { result: { ...result, id: saved.id }, values: raw };
}
