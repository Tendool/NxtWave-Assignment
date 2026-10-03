"use server";

import { z } from "zod";
import { allEvaluations, insertEvaluation } from "@/lib/db";
import { evaluate, gatherEvidence, type EvalResult } from "@/lib/evaluate";

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

  // Each evaluation can call an LLM and fetch external pages — don't let one link be spammed.
  const prior = (await allEvaluations()).filter((e) => e.project_url === d.project_url).length;
  if (prior >= 3) return { error: "This project has already been evaluated 3 times. Improve it and submit a new link.", values: raw };

  const evidence = await gatherEvidence(d.project_url, d.repo_url || null, d.description);
  const result = await evaluate(evidence);

  const saved = await insertEvaluation({
    ref_code: d.ref_code?.toUpperCase() || null,
    name: d.name,
    project_url: d.project_url,
    repo_url: d.repo_url || null,
    description: d.description,
    scores: result.scores,
    total: result.total,
    feedback: result.feedback,
  });
  return { result: { ...result, id: saved.id }, values: raw };
}
