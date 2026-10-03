/** Client-safe types and defaults for the timed challenge. */
import type { Requirements } from "@/db/schema";

export type Policy = {
  /** pool: each student gets one of the active assessments, balanced at random.
   *  per_student: a fresh question is generated for each student when they start (falls back to the pool). */
  mode: "pool" | "per_student";
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  durationMinutes: number;
  requirements: Requirements;
  /** Whether students see their AI score and feedback after submitting. */
  showScores: boolean;
};

export const DEFAULT_REQUIREMENTS: Requirements = { code: "required", hosted: "optional", video: "off" };

export const DEFAULT_POLICY: Policy = {
  mode: "pool",
  topic: "Build a small AI-powered tool that solves a real problem for students",
  difficulty: "beginner",
  durationMinutes: 60,
  requirements: DEFAULT_REQUIREMENTS,
  showScores: true,
};

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

export const REQUIREMENT_LABELS: Record<keyof Requirements, string> = {
  code: "GitHub repo and/or zip",
  hosted: "Hosted link",
  video: "Demo video",
};

export const MAX_VARIANTS = 20;
