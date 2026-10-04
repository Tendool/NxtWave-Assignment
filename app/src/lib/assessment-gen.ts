import "server-only";
import type { Requirements } from "@/db/schema";
import { askJson } from "./ai";
import { findMissingMaterial } from "./assessment-checks";

export type GenInput = {
  topic: string;
  difficulty: string;
  durationMinutes: number;
  requirements: Requirements;
  /** For fairness: variants test the same skills at the same difficulty, only the scenario changes. */
  variant?: { index: number; total: number; /** same seed for a whole batch so each variant lands on a different domain */ seed: number };
  /** Titles that already exist for this topic — the model must not reuse or imitate them. */
  avoidTitles?: string[];
};

export type GeneratedAssessment = { title: string; brief: string };

/** Concrete domains, handed out one per variant. Left to itself a small model writes the same idea every time. */
const DOMAINS = [
  "campus life and student wellbeing", "agriculture and farming", "personal finance and budgeting", "healthcare and fitness",
  "travel and local tourism", "sports and coaching", "law, rights and government forms", "accessibility for people with disabilities",
  "climate and energy saving", "music and creative writing", "job hunting and interviews", "cooking and nutrition",
  "language learning", "public transport and city life", "small-business and shop owners", "news, fact-checking and media literacy",
  "gaming and esports", "parenting and early education", "disaster and emergency information", "cybersecurity awareness",
  "history and museums", "retail and e-commerce", "mental health and journaling", "open-source and developer tools",
];

export const pickDomain = (seed: number, index: number) => DOMAINS[(((seed + index) % DOMAINS.length) + DOMAINS.length) % DOMAINS.length];

const SYSTEM = `You write practical, timed build challenges for final-year engineering students.
Write ONE challenge. Be concrete and unambiguous. No fluff, no marketing language.
Return separate fields; the system assembles them into the final document:
- "context": 2-3 sentences setting the scene for a specific person with a real problem.
- "task": 2-4 sentences saying exactly what to build.
- "requirements": an array of 4-6 short, testable requirements. At least one must involve using an AI model or API meaningfully.
- "judging": an array of 3-4 short points describing what makes a submission good.
Everything must be achievable by a beginner-to-intermediate student in the stated time using free tools. Do NOT mention deliverables or submission format; the system adds that.
SELF-CONTAINED: the student receives ONLY this text — no dataset, file, repository, starter code, template or API key. Never say anything is "provided", "attached", "included" or "given". If the idea needs data, tell the student to type a small sample themselves (10-20 rows of JSON or CSV) or to use a free public API that needs no approval.
KEEP IT DOABLE: one core feature on one screen. The AI part should call a hosted model API (free tiers exist) or a local model — never require training a model from scratch. Requirements must not contradict each other. Name tools only as examples ("e.g."), never as the only allowed choice.
If you are told this is variant N of M, keep the SAME skills, difficulty and scope as the others but use the DIFFERENT scenario you are given, so students cannot copy each other and nobody gets an easier or harder question.
Reply with ONLY a JSON object: {"title":"short specific title","context":"...","task":"...","requirements":["..."],"judging":["..."]}`;

function deliverablesText(r: Requirements) {
  const word = (v: string) => (v === "required" ? "required" : v === "optional" ? "optional" : null);
  const parts: string[] = [];
  if (word(r.code)) parts.push(`Source code as a public GitHub repo link and/or a zip file (${word(r.code)}).`);
  if (word(r.hosted)) parts.push(`A live hosted link (${word(r.hosted)}).`);
  if (word(r.video)) parts.push(`A short demo video, as a link or a file (${word(r.video)}).`);
  return parts.join(" ");
}

type Parts = { context: string; task: string; requirements: string[]; judging: string[] };

/** Assemble the brief ourselves so the structure and the deliverables are always right, whatever the model does. */
function assemble(p: Parts, r: Requirements, minutes: number) {
  const deliverables = [
    r.code !== "off" && `- Your source code: a public GitHub repo link and/or a zip file (${r.code}).`,
    r.hosted !== "off" && `- A live hosted link (${r.hosted}).`,
    r.video !== "off" && `- A short demo video, as a link or an upload (${r.video}).`,
  ].filter(Boolean);
  const lines = (xs: string[]) => xs.join("\n");
  return [
    `## Context\n${p.context}`,
    `## Your task\n${p.task}\n\nYou have **${minutes} minutes**.`,
    `## Requirements\n${lines(p.requirements.map((x, i) => `${i + 1}. ${x}`))}`,
    `## Deliverables\n${deliverables.length ? lines(deliverables as string[]) : "- Describe what you built in the notes box."}`,
    `## How it will be judged\n${lines(p.judging.map((x) => `- ${x}`))}`,
  ].join("\n\n");
}

/** Keep only real strings, strip any "1." numbering the model added, and cap the count. */
const strs = (v: unknown, max: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 3).map((x) => x.trim().replace(/^\d+[.)]\s*/, "").slice(0, 300)).slice(0, max) : [];

export async function generateAssessment(input: GenInput): Promise<GeneratedAssessment | null> {
  const avoid = (input.avoidTitles ?? []).map((t) => t.toLowerCase().trim());
  const domain = input.variant ? pickDomain(input.variant.seed, input.variant.index) : DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  const v = input.variant ? `This is variant ${input.variant.index} of ${input.variant.total}.` : "This is a single, unique challenge.";

  // A duplicate title means the model ignored the scenario; a brief pointing at a "provided dataset" can't be done.
  // Either way, retry (hotter) before giving up — the caller falls back to the pool.
  for (let attempt = 0; attempt < 3; attempt++) {
    const out = await askJson<{ title?: unknown; context?: unknown; task?: unknown; requirements?: unknown; judging?: unknown }>(
      SYSTEM,
      [
        `Topic: ${input.topic}`,
        `Difficulty: ${input.difficulty}`,
        `Time limit: ${input.durationMinutes} minutes`,
        `Deliverables the organiser wants: ${deliverablesText(input.requirements)}`,
        v,
        `Set the scenario in this domain: ${domain}. The product idea, users and data must come from that domain.`,
        avoid.length ? `These challenges already exist — do NOT reuse or closely imitate their titles or ideas: ${(input.avoidTitles ?? []).slice(0, 25).join(" | ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      1400,
      Math.min(1.1, 0.9 + attempt * 0.1),
    );
    if (!out || typeof out.title !== "string" || typeof out.context !== "string" || typeof out.task !== "string") continue;
    const title = out.title.trim().slice(0, 120);
    const requirements = strs(out.requirements, 6);
    if (!title || out.context.trim().length < 30 || out.task.trim().length < 30 || requirements.length < 3) continue;
    if (avoid.includes(title.toLowerCase())) continue;
    const judging = strs(out.judging, 4);
    if (findMissingMaterial([out.context, out.task, ...requirements, ...judging].join("\n"))) continue;
    const brief = assemble(
      {
        context: out.context.trim().slice(0, 700),
        task: out.task.trim().slice(0, 700),
        requirements,
        judging: judging.length ? judging : ["Whether it works", "Whether it does what this brief asks", "How sensibly AI is used", "Code quality and a clear README"],
      },
      input.requirements,
      input.durationMinutes,
    );
    return { title, brief };
  }
  return null;
}

/** Used when no assessment exists yet and none can be generated, so the flow never dead-ends. */
export const DEFAULT_ASSESSMENT: GeneratedAssessment = {
  title: "Build your first AI project",
  brief: `## Context
You have 60 minutes to build and ship a small project that uses an AI model to do something genuinely useful for other students.

## Your task
Pick one small problem — summarising lecture notes, explaining code, mock-interview practice, turning a syllabus into a study plan — and build a working tool for it where an AI model does the core job.

## Requirements
1. A clear input and a clear output a student could use today.
2. An AI model (hosted API or local) does the central work, not decoration.
3. Handle at least one failure case gracefully (empty input, API error, bad output).
4. Include a README: what it does, how to run it, and which model you used.

## Deliverables
Submit your source code (public GitHub repo link and/or a zip). A hosted link is welcome but optional.

## How it will be judged
Whether it works, whether it does what this brief asks, how central and sensible the AI use is, code quality, and how clearly you explain it.`,
};
