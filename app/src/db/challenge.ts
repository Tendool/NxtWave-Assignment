import "server-only";
import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema, type DB } from "./index";
import { getSetting, setSetting } from "./settings";
import { aiEnabled } from "@/lib/ai";
import { DEFAULT_ASSESSMENT, generateAssessment } from "@/lib/assessment-gen";
import { evaluateChallenge } from "@/lib/challenge-eval";
import { randomBytes } from "node:crypto";
import { CHALLENGE_RUBRIC } from "@/lib/rubric";
import { DEFAULT_POLICY, DEFAULT_REQUIREMENTS, type Policy } from "@/lib/challenge-types";
import { summarizeZip } from "@/lib/zip-summary";
import { firstNameInitial } from "@/lib/format";

const { registrations, colleges, assessments, attempts, submissions, storedFiles, shares } = schema;
type Requirements = schema.Requirements;
type Db = DB | Parameters<Parameters<DB["transaction"]>[0]>[0];

/** A little slack past the deadline so a submit that was clicked at 00:00 isn't lost to network latency. */
export const GRACE_MS = 90_000;

// ───────────────────────── policy ─────────────────────────

export async function getPolicy(): Promise<Policy> {
  const row = await getSetting("assessment_policy");
  if (!row) return DEFAULT_POLICY;
  try {
    return { ...DEFAULT_POLICY, ...(JSON.parse(row.value) as Partial<Policy>) };
  } catch {
    return DEFAULT_POLICY;
  }
}

export async function savePolicy(p: Policy) {
  await setSetting("assessment_policy", JSON.stringify(p));
}

// ───────────────────────── files ─────────────────────────

export async function saveFile(f: { filename: string; mime: string; data: Buffer }, db?: Db) {
  const d = db ?? (await getDb());
  const [row] = await d
    .insert(storedFiles)
    .values({ filename: f.filename.slice(0, 200), mime: f.mime, size: f.data.length, data: f.data })
    .returning({ id: storedFiles.id });
  return row.id;
}

export async function getFile(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(storedFiles).where(eq(storedFiles.id, id)).limit(1);
  return row ?? null;
}

// ───────────────────────── students ─────────────────────────

export async function getStudentByToken(token: string | null) {
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({
      id: registrations.id,
      name: registrations.name,
      email: registrations.email,
      refCode: registrations.refCode,
      college: colleges.name,
    })
    .from(registrations)
    .innerJoin(colleges, eq(colleges.id, registrations.collegeId))
    .where(eq(registrations.accessToken, token))
    .limit(1);
  return row ?? null;
}

/** Recovery on a new device: both email and WhatsApp must match the same registration. */
export async function recoverAccessToken(email: string, whatsapp: string) {
  const db = await getDb();
  const [row] = await db
    .select({ token: registrations.accessToken })
    .from(registrations)
    .where(sql`lower(${registrations.email}) = ${email.toLowerCase()} and ${registrations.whatsapp} = ${whatsapp}`)
    .limit(1);
  return row?.token ?? null;
}

export async function logShare(registrationId: string, channel: string) {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(shares).where(eq(shares.registrationId, registrationId));
  if (n >= 60) return; // not a metric anyone should be able to inflate with a script
  await db.insert(shares).values({ registrationId, channel });
}

// ───────────────────────── attempts ─────────────────────────

export type AttemptView = {
  id: string;
  startedAt: Date;
  deadlineAt: Date;
  submittedAt: Date | null;
  status: "running" | "submitted" | "expired";
  assessment: {
    id: string;
    title: string;
    brief: string;
    requirements: Requirements;
    durationMinutes: number;
    attachment: { id: string; filename: string; size: number } | null;
  };
  submission: {
    id: string;
    repoUrl: string | null;
    hostedUrl: string | null;
    videoUrl: string | null;
    zipName: string | null;
    videoFileName: string | null;
    notes: string | null;
    total: number | null;
    scores: Record<string, number> | null;
    feedback: string | null;
    scoreMode: string | null;
    scoreError: string | null;
    scoredAt: Date | null;
    /** True when a person overrode the AI score; then total/scores here are the human's. */
    humanChecked: boolean;
    shareSlug: string | null;
  } | null;
};

export async function getAttempt(registrationId: string): Promise<AttemptView | null> {
  const db = await getDb();
  const [a] = await db.select().from(attempts).where(eq(attempts.registrationId, registrationId)).limit(1);
  if (!a) return null;
  const [as] = await db.select().from(assessments).where(eq(assessments.id, a.assessmentId)).limit(1);
  const [att] = as.attachmentFileId
    ? await db.select({ id: storedFiles.id, filename: storedFiles.filename, size: storedFiles.size }).from(storedFiles).where(eq(storedFiles.id, as.attachmentFileId))
    : [];
  const [s] = await db.select().from(submissions).where(eq(submissions.attemptId, a.id)).limit(1);

  const fileName = async (id: string | null) =>
    id ? ((await db.select({ n: storedFiles.filename }).from(storedFiles).where(eq(storedFiles.id, id)))[0]?.n ?? null) : null;

  const now = Date.now();
  const status = a.submittedAt ? "submitted" : now > a.deadlineAt.getTime() + GRACE_MS ? "expired" : "running";
  return {
    id: a.id,
    startedAt: a.startedAt,
    deadlineAt: a.deadlineAt,
    submittedAt: a.submittedAt,
    status,
    assessment: {
      id: as.id,
      title: as.title,
      brief: as.brief,
      requirements: as.requirements,
      durationMinutes: as.durationMinutes,
      attachment: att ?? null,
    },
    submission: s
      ? {
          id: s.id,
          repoUrl: s.repoUrl,
          hostedUrl: s.hostedUrl,
          videoUrl: s.videoUrl,
          zipName: await fileName(s.zipFileId),
          videoFileName: await fileName(s.videoFileId),
          notes: s.notes,
          total: s.humanTotal ?? s.total,
          scores: s.humanScores ?? s.scores,
          feedback: s.feedback,
          scoreMode: s.scoreMode,
          scoreError: s.scoreError,
          scoredAt: s.scoredAt,
          humanChecked: s.humanTotal !== null,
          shareSlug: s.shareSlug,
        }
      : null,
  };
}

async function ensureDefaultAssessment(db: Db, policy: Policy) {
  const [existing] = await db.select({ id: assessments.id }).from(assessments).where(and(eq(assessments.active, true), isNull(assessments.generatedForId))).limit(1);
  if (existing) return;
  await db.insert(assessments).values({
    title: DEFAULT_ASSESSMENT.title,
    brief: DEFAULT_ASSESSMENT.brief,
    topic: policy.topic,
    source: "manual",
    requirements: policy.requirements ?? DEFAULT_REQUIREMENTS,
    durationMinutes: policy.durationMinutes,
  });
}

/** Least-assigned first, random among ties — so variants are handed out evenly but unpredictably. */
async function pickFromPool(db: Db) {
  const rows = await db
    .select({ id: assessments.id, duration: assessments.durationMinutes, n: count(attempts.id) })
    .from(assessments)
    .leftJoin(attempts, eq(attempts.assessmentId, assessments.id))
    .where(and(eq(assessments.active, true), isNull(assessments.generatedForId)))
    .groupBy(assessments.id)
    .orderBy(asc(count(attempts.id)), sql`random()`)
    .limit(1);
  return rows[0] ?? null;
}

export type StartResult = { ok: true } | { ok: false; error: string };

export async function startAttempt(registrationId: string): Promise<StartResult> {
  const db = await getDb();
  const [have] = await db.select({ id: attempts.id }).from(attempts).where(eq(attempts.registrationId, registrationId)).limit(1);
  if (have) return { ok: true }; // already started — never restart someone's clock

  const policy = await getPolicy();
  let chosen: { id: string; duration: number } | null = null;

  // "Generated for everyone separately": a fresh question for this student, falling back to the pool.
  if (policy.mode === "per_student" && (await aiEnabled())) {
    const g = await generateAssessment({ topic: policy.topic, difficulty: policy.difficulty, durationMinutes: policy.durationMinutes, requirements: policy.requirements });
    if (g) {
      const [row] = await db
        .insert(assessments)
        .values({ title: g.title, brief: g.brief, topic: policy.topic, source: "ai", requirements: policy.requirements, durationMinutes: policy.durationMinutes, generatedForId: registrationId })
        .returning({ id: assessments.id });
      chosen = { id: row.id, duration: policy.durationMinutes };
    }
  }
  if (!chosen) {
    await ensureDefaultAssessment(db, policy);
    const p = await pickFromPool(db);
    if (p) chosen = { id: p.id, duration: p.duration };
  }
  if (!chosen) return { ok: false, error: "No assessment is available yet. Please try again shortly." };

  const now = new Date();
  await db
    .insert(attempts)
    .values({ registrationId, assessmentId: chosen.id, startedAt: now, deadlineAt: new Date(now.getTime() + chosen.duration * 60_000) })
    .onConflictDoNothing({ target: attempts.registrationId });
  return { ok: true };
}

export type SubmitInput = {
  repoUrl: string | null;
  hostedUrl: string | null;
  videoUrl: string | null;
  notes: string | null;
  zip: { filename: string; mime: string; data: Buffer } | null;
  videoFile: { filename: string; mime: string; data: Buffer } | null;
};

export async function submitAttempt(registrationId: string, input: SubmitInput): Promise<{ ok: true; submissionId: string } | { ok: false; error: string }> {
  const db = await getDb();
  const view = await getAttempt(registrationId);
  if (!view) return { ok: false, error: "You haven't started the challenge." };
  if (view.submittedAt) return { ok: false, error: "You've already submitted." };
  if (Date.now() > view.deadlineAt.getTime() + GRACE_MS) return { ok: false, error: "Time's up — the submission window has closed." };

  const r = view.assessment.requirements;
  const hasCode = !!input.repoUrl || !!input.zip;
  const hasVideo = !!input.videoUrl || !!input.videoFile;
  if (r.code === "required" && !hasCode) return { ok: false, error: "Add a GitHub repo link or upload a zip of your code." };
  if (r.hosted === "required" && !input.hostedUrl) return { ok: false, error: "Add the hosted link." };
  if (r.video === "required" && !hasVideo) return { ok: false, error: "Add your demo video (a link or a file)." };

  const submissionId = await db.transaction(async (tx) => {
    const zipFileId = input.zip ? await saveFile(input.zip, tx) : null;
    const videoFileId = input.videoFile ? await saveFile(input.videoFile, tx) : null;
    const [s] = await tx
      .insert(submissions)
      .values({
        attemptId: view.id,
        repoUrl: input.repoUrl,
        hostedUrl: input.hostedUrl,
        videoUrl: input.videoUrl,
        zipFileId,
        videoFileId,
        notes: input.notes,
      })
      .returning({ id: submissions.id });
    await tx.update(attempts).set({ submittedAt: new Date() }).where(eq(attempts.id, view.id));
    return s.id;
  });
  return { ok: true, submissionId };
}

/** Scores a submission with the configured model (or the basic check) and stores the result. Never throws. */
export async function scoreSubmission(submissionId: string) {
  const db = await getDb();
  try {
    const [s] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
    if (!s) return;
    const [a] = await db.select().from(attempts).where(eq(attempts.id, s.attemptId)).limit(1);
    const [as] = await db.select().from(assessments).where(eq(assessments.id, a.assessmentId)).limit(1);

    let zip = null;
    if (s.zipFileId) {
      const f = await getFile(s.zipFileId);
      if (f) zip = summarizeZip(f.data);
    }
    const result = await evaluateChallenge({
      title: as.title,
      brief: as.brief,
      hostedUrl: s.hostedUrl,
      repoUrl: s.repoUrl,
      notes: s.notes ?? "",
      zip,
      hasVideo: !!s.videoUrl || !!s.videoFileId,
    });
    await db
      .update(submissions)
      .set({
        scores: result.scores,
        total: result.total,
        feedback: result.feedback,
        scoreMode: result.mode,
        scoreModel: result.model,
        reviews: result.reviews,
        needsReview: result.needsReview,
        scoreError: null,
        scoredAt: new Date(),
      })
      .where(eq(submissions.id, submissionId));
  } catch (e) {
    await db
      .update(submissions)
      .set({ scoreError: String((e as Error).message).slice(0, 300) })
      .where(eq(submissions.id, submissionId))
      .catch(() => {});
  }
}

// ───────────────────────── assessments (admin) ─────────────────────────

export async function listAssessmentsAdmin() {
  const db = await getDb();
  return db
    .select({
      id: assessments.id,
      title: assessments.title,
      source: assessments.source,
      topic: assessments.topic,
      active: assessments.active,
      durationMinutes: assessments.durationMinutes,
      requirements: assessments.requirements,
      generatedForId: assessments.generatedForId,
      hasAttachment: sql<boolean>`${assessments.attachmentFileId} is not null`,
      createdAt: assessments.createdAt,
      assigned: count(attempts.id),
      avgScore: sql<number | null>`round(avg(${submissions.total}))::int`,
    })
    .from(assessments)
    .leftJoin(attempts, eq(attempts.assessmentId, assessments.id))
    .leftJoin(submissions, eq(submissions.attemptId, attempts.id))
    .groupBy(assessments.id)
    .orderBy(desc(assessments.createdAt));
}

/** Titles of the shared pool, so new variants can be told what already exists. */
export async function poolTitles() {
  const db = await getDb();
  const rows = await db.select({ title: assessments.title }).from(assessments).where(isNull(assessments.generatedForId)).orderBy(desc(assessments.createdAt)).limit(60);
  return rows.map((r) => r.title);
}

export async function getAssessmentAdmin(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(assessments).where(eq(assessments.id, id)).limit(1);
  return row ?? null;
}

export async function createAssessment(v: {
  title: string;
  brief: string;
  topic?: string | null;
  source: "manual" | "upload" | "ai";
  requirements: Requirements;
  durationMinutes: number;
  attachment?: { filename: string; mime: string; data: Buffer } | null;
}) {
  const db = await getDb();
  const attachmentFileId = v.attachment ? await saveFile(v.attachment) : null;
  const [row] = await db
    .insert(assessments)
    .values({
      title: v.title,
      brief: v.brief,
      topic: v.topic ?? null,
      source: v.source,
      requirements: v.requirements,
      durationMinutes: v.durationMinutes,
      attachmentFileId,
    })
    .returning({ id: assessments.id });
  return row.id;
}

export async function setAssessmentActive(id: string, active: boolean) {
  const db = await getDb();
  await db.update(assessments).set({ active }).where(eq(assessments.id, id));
}

/** Only unused assessments can be deleted — students' attempts reference the rest. */
export async function deleteAssessment(id: string) {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(attempts).where(eq(attempts.assessmentId, id));
  if (n > 0) return false;
  await db.delete(assessments).where(eq(assessments.id, id));
  return true;
}

// ───────────────────────── submissions & scores (admin) ─────────────────────────

export async function listAttemptsAdmin() {
  const db = await getDb();
  const rows = await db
    .select({
      attemptId: attempts.id,
      studentName: registrations.name,
      email: registrations.email,
      college: colleges.name,
      assessmentTitle: assessments.title,
      startedAt: attempts.startedAt,
      deadlineAt: attempts.deadlineAt,
      submittedAt: attempts.submittedAt,
      submissionId: submissions.id,
      repoUrl: submissions.repoUrl,
      hostedUrl: submissions.hostedUrl,
      videoUrl: submissions.videoUrl,
      hasZip: sql<boolean>`${submissions.zipFileId} is not null`,
      hasVideoFile: sql<boolean>`${submissions.videoFileId} is not null`,
      total: sql<number | null>`coalesce(${submissions.humanTotal}, ${submissions.total})`,
      humanChecked: sql<boolean>`${submissions.humanTotal} is not null`,
      needsReview: submissions.needsReview,
      scoreMode: submissions.scoreMode,
    })
    .from(attempts)
    .innerJoin(registrations, eq(registrations.id, attempts.registrationId))
    .innerJoin(colleges, eq(colleges.id, registrations.collegeId))
    .innerJoin(assessments, eq(assessments.id, attempts.assessmentId))
    .leftJoin(submissions, eq(submissions.attemptId, attempts.id))
    .orderBy(desc(attempts.startedAt));
  const now = Date.now();
  return rows.map((r) => ({
    ...r,
    status: (r.submittedAt ? "submitted" : now > r.deadlineAt.getTime() + GRACE_MS ? "expired" : "running") as "submitted" | "expired" | "running",
  }));
}

export async function attemptDetailAdmin(attemptId: string) {
  const db = await getDb();
  const [a] = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
  if (!a) return null;
  const [reg] = await db
    .select({ id: registrations.id, name: registrations.name, email: registrations.email, whatsapp: registrations.whatsapp, branch: registrations.branch, year: registrations.year, college: colleges.name, refCode: registrations.refCode })
    .from(registrations)
    .innerJoin(colleges, eq(colleges.id, registrations.collegeId))
    .where(eq(registrations.id, a.registrationId));
  const [as] = await db.select().from(assessments).where(eq(assessments.id, a.assessmentId));
  const [s] = await db.select().from(submissions).where(eq(submissions.attemptId, a.id)).limit(1);
  const meta = async (id: string | null) =>
    id ? ((await db.select({ id: storedFiles.id, filename: storedFiles.filename, size: storedFiles.size, mime: storedFiles.mime }).from(storedFiles).where(eq(storedFiles.id, id)))[0] ?? null) : null;
  const sharesRows = await db.select({ channel: shares.channel, n: count() }).from(shares).where(eq(shares.registrationId, a.registrationId)).groupBy(shares.channel);
  return {
    attempt: a,
    student: reg,
    assessment: as,
    submission: s ?? null,
    zip: s ? await meta(s.zipFileId) : null,
    videoFile: s ? await meta(s.videoFileId) : null,
    attachment: await meta(as.attachmentFileId),
    shares: sharesRows,
  };
}

export async function scoresOverview() {
  const db = await getDb();
  const final = sql<number | null>`coalesce(${submissions.humanTotal}, ${submissions.total})`;
  const rows = await db
    .select({
      submissionId: submissions.id,
      attemptId: attempts.id,
      studentName: registrations.name,
      college: colleges.name,
      assessmentId: assessments.id,
      assessmentTitle: assessments.title,
      scores: sql<Record<string, number> | null>`coalesce(${submissions.humanScores}, ${submissions.scores})`,
      aiTotal: submissions.total,
      total: final,
      humanTotal: submissions.humanTotal,
      needsReview: submissions.needsReview,
      reviews: submissions.reviews,
      scoreMode: submissions.scoreMode,
      scoreModel: submissions.scoreModel,
      scoreError: submissions.scoreError,
      submittedAt: attempts.submittedAt,
      startedAt: attempts.startedAt,
    })
    .from(submissions)
    .innerJoin(attempts, eq(attempts.id, submissions.attemptId))
    .innerJoin(registrations, eq(registrations.id, attempts.registrationId))
    .innerJoin(colleges, eq(colleges.id, registrations.collegeId))
    .innerJoin(assessments, eq(assessments.id, attempts.assessmentId))
    .orderBy(sql`coalesce(${submissions.humanTotal}, ${submissions.total}) desc nulls last`, asc(attempts.submittedAt));

  const byAssessment = await db
    .select({ id: assessments.id, title: assessments.title, n: count(submissions.id), avg: sql<number | null>`round(avg(coalesce(${submissions.humanTotal}, ${submissions.total})))::int` })
    .from(assessments)
    .innerJoin(attempts, eq(attempts.assessmentId, assessments.id))
    .innerJoin(submissions, eq(submissions.attemptId, attempts.id))
    .groupBy(assessments.id)
    .orderBy(desc(sql`avg(coalesce(${submissions.humanTotal}, ${submissions.total}))`));

  return { rows, byAssessment, calibration: calibrate(rows), reviewers: reviewerStats(rows) };
}

/** How often each reviewer's quotes actually appear in what the student submitted. A reviewer that can't cite is a reviewer to distrust. */
export function reviewerStats(rows: { reviews: schema.Review[] | null }[]) {
  const m = new Map<string, { quotes: number; verified: number; scored: number; failed: number }>();
  for (const r of rows) {
    for (const rv of r.reviews ?? []) {
      const e = m.get(rv.model) ?? { quotes: 0, verified: 0, scored: 0, failed: 0 };
      if (rv.error) e.failed += 1;
      else {
        e.scored += 1;
        for (const k of CHALLENGE_RUBRIC.map((c) => c.key)) {
          e.quotes += 1;
          if (rv.evidence?.[k]?.verified) e.verified += 1;
        }
      }
      m.set(rv.model, e);
    }
  }
  return [...m.entries()].map(([model, e]) => ({ model, scored: e.scored, failed: e.failed, evidenceRate: e.quotes ? Math.round((e.verified / e.quotes) * 100) : null }));
}

/**
 * How far the AI is from a person, measured on submissions a human has re-scored.
 * The honest answer to "can we trust the AI grading?" is a number, not a claim.
 */
export function calibrate(rows: { aiTotal: number | null; humanTotal: number | null; reviews: schema.Review[] | null }[]) {
  const pairs = rows.filter((r) => r.humanTotal !== null && r.aiTotal !== null) as { aiTotal: number; humanTotal: number; reviews: schema.Review[] | null }[];
  if (pairs.length === 0) return null;
  const errs = pairs.map((r) => r.aiTotal - r.humanTotal);
  const mae = errs.reduce((a, e) => a + Math.abs(e), 0) / errs.length;
  const perModel = new Map<string, number[]>();
  for (const r of pairs) for (const rv of (r.reviews ?? []).filter((x) => !x.error)) perModel.set(rv.model, [...(perModel.get(rv.model) ?? []), Math.abs(rv.total - r.humanTotal)]);
  return {
    n: pairs.length,
    mae: Math.round(mae * 10) / 10,
    within10: Math.round((errs.filter((e) => Math.abs(e) <= 10).length / errs.length) * 100),
    bias: Math.round((errs.reduce((a, e) => a + e, 0) / errs.length) * 10) / 10, // + means the AI is more generous than people
    perModel: [...perModel.entries()].map(([model, e]) => ({ model, mae: Math.round((e.reduce((a, b) => a + b, 0) / e.length) * 10) / 10, n: e.length })),
  };
}

// ───────────── human override ─────────────

export async function saveHumanScore(submissionId: string, scores: Record<string, number>, note: string) {
  const db = await getDb();
  const clean: Record<string, number> = {};
  for (const c of CHALLENGE_RUBRIC) clean[c.key] = Math.max(0, Math.min(20, Math.round(Number(scores[c.key]) || 0)));
  const total = Object.values(clean).reduce((a, b) => a + b, 0);
  await db
    .update(submissions)
    .set({ humanScores: clean, humanTotal: total, humanNote: note.slice(0, 1000) || null, humanAt: new Date(), needsReview: false })
    .where(eq(submissions.id, submissionId));
}

export async function clearHumanScore(submissionId: string) {
  const db = await getDb();
  await db.update(submissions).set({ humanScores: null, humanTotal: null, humanNote: null, humanAt: null }).where(eq(submissions.id, submissionId));
}

// ───────────── shareable proof-of-work card ─────────────

const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** The student opts in. Until then a result is never reachable from any public URL. */
export async function ensureShareSlug(registrationId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: submissions.id, slug: submissions.shareSlug, total: submissions.total })
    .from(submissions)
    .innerJoin(attempts, eq(attempts.id, submissions.attemptId))
    .where(eq(attempts.registrationId, registrationId))
    .limit(1);
  if (!row || row.total === null) return null; // only scored work gets a card
  if (row.slug) return row.slug;
  for (let i = 0; i < 5; i++) {
    const slug = [...randomBytes(10)].map((b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("");
    try {
      await db.update(submissions).set({ shareSlug: slug }).where(eq(submissions.id, row.id));
      return slug;
    } catch {
      /* unique clash: try another */
    }
  }
  return null;
}

/** Public data for a card: first name and college only, plus the invite code so new people credit the sharer. */
/**
 * Challenge results students chose to make public (they pressed "Create my result card"), newest first.
 * Only what the public proof page already shows: first name + initial, college, challenge title, time and score.
 */
export async function sharedProofs(limit = 24) {
  const db = await getDb();
  const rows = await db
    .select({
      slug: submissions.shareSlug,
      name: registrations.name,
      college: colleges.name,
      title: assessments.title,
      startedAt: attempts.startedAt,
      submittedAt: attempts.submittedAt,
      total: sql<number | null>`coalesce(${submissions.humanTotal}, ${submissions.total})`,
    })
    .from(submissions)
    .innerJoin(attempts, eq(attempts.id, submissions.attemptId))
    .innerJoin(registrations, eq(registrations.id, attempts.registrationId))
    .innerJoin(colleges, eq(colleges.id, registrations.collegeId))
    .innerJoin(assessments, eq(assessments.id, attempts.assessmentId))
    .where(sql`${submissions.shareSlug} is not null`)
    .orderBy(desc(submissions.createdAt))
    .limit(limit);
  const { showScores } = await getPolicy();
  return rows.map((r) => ({
    slug: r.slug!,
    name: firstNameInitial(r.name),
    college: r.college,
    title: r.title,
    minutes: r.submittedAt ? Math.max(1, Math.round((r.submittedAt.getTime() - r.startedAt.getTime()) / 60_000)) : null,
    total: showScores ? r.total : null,
  }));
}

export async function getProof(slug: string) {
  if (!/^[a-z0-9]{10}$/.test(slug)) return null;
  const db = await getDb();
  const [r] = await db
    .select({
      name: registrations.name,
      college: colleges.name,
      refCode: registrations.refCode,
      title: assessments.title,
      startedAt: attempts.startedAt,
      submittedAt: attempts.submittedAt,
      total: sql<number | null>`coalesce(${submissions.humanTotal}, ${submissions.total})`,
      scores: sql<Record<string, number> | null>`coalesce(${submissions.humanScores}, ${submissions.scores})`,
    })
    .from(submissions)
    .innerJoin(attempts, eq(attempts.id, submissions.attemptId))
    .innerJoin(registrations, eq(registrations.id, attempts.registrationId))
    .innerJoin(colleges, eq(colleges.id, registrations.collegeId))
    .innerJoin(assessments, eq(assessments.id, attempts.assessmentId))
    .where(eq(submissions.shareSlug, slug))
    .limit(1);
  if (!r) return null;
  const policy = await getPolicy();
  const minutes = r.submittedAt ? Math.max(1, Math.round((r.submittedAt.getTime() - r.startedAt.getTime()) / 60_000)) : null;
  return {
    firstName: r.name.split(/\s+/)[0],
    college: r.college,
    refCode: r.refCode,
    title: r.title,
    minutes,
    total: policy.showScores ? r.total : null,
    scores: policy.showScores ? r.scores : null,
  };
}

export async function funnelStats() {
  const db = await getDb();
  const [{ regs }] = await db.select({ regs: count() }).from(registrations);
  const [{ started }] = await db.select({ started: count() }).from(attempts);
  const [{ submitted }] = await db.select({ submitted: count() }).from(attempts).where(sql`${attempts.submittedAt} is not null`);
  const [{ scored }] = await db.select({ scored: count() }).from(submissions).where(sql`${submissions.total} is not null`);
  const [{ flagged }] = await db.select({ flagged: count() }).from(submissions).where(and(eq(submissions.needsReview, true), sql`${submissions.humanTotal} is null`));
  const [{ sharers }] = await db.select({ sharers: sql<number>`count(distinct ${shares.registrationId})::int` }).from(shares);
  const byChannel = await db.select({ channel: shares.channel, n: count() }).from(shares).groupBy(shares.channel).orderBy(desc(count()));
  return { regs, sharers, started, submitted, scored, flagged, byChannel };
}
