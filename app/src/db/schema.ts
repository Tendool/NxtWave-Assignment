import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  customType,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Postgres bytea <-> Node Buffer (PGlite returns Uint8Array, node-postgres returns Buffer). */
const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  toDriver: (v) => v,
  fromDriver: (v) => Buffer.from(v),
});

export const branchEnum = pgEnum("branch", [
  "CSE",
  "IT",
  "AI & Data Science / ML",
  "ECE",
  "EEE",
  "Mechanical",
  "Civil",
  "Other",
]);

export const yearEnum = pgEnum("study_year", ["Final year (4th)", "Pre-final year (3rd)", "Recently graduated"]);

/** Reference table. Seeded from colleges-data.ts; students can add a missing one (verified = false). */
export const colleges = pgTable(
  "colleges",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    city: text("city"),
    state: text("state"),
    kind: text("kind"), // IIT / NIT / IIIT / Central / State / Private / Deemed
    verified: boolean("verified").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("colleges_slug_uq").on(t.slug), index("colleges_state_idx").on(t.state)],
).enableRLS();

export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    whatsapp: text("whatsapp").notNull(),
    collegeId: integer("college_id")
      .notNull()
      .references(() => colleges.id),
    branch: branchEnum("branch").notNull(),
    year: yearEnum("year").notNull(),
    refCode: text("ref_code").notNull(),
    // Private. The referral code is public (it is in every shared link), so it can never identify a student;
    // this token lives in the student's own cookie and gates the challenge.
    accessToken: text("access_token").notNull().default(sql`replace(gen_random_uuid()::text, '-', '')`),
    referredById: uuid("referred_by_id").references((): AnyPgColumn => registrations.id, { onDelete: "set null" }),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("registrations_email_uq").on(sql`lower(${t.email})`),
    uniqueIndex("registrations_whatsapp_uq").on(t.whatsapp),
    uniqueIndex("registrations_ref_code_uq").on(t.refCode),
    uniqueIndex("registrations_access_token_uq").on(t.accessToken),
    index("registrations_college_idx").on(t.collegeId),
    index("registrations_referred_by_idx").on(t.referredById),
    index("registrations_created_idx").on(t.createdAt),
    check("registrations_no_self_referral", sql`${t.referredById} is null or ${t.referredById} <> ${t.id}`),
    check("registrations_whatsapp_fmt", sql`${t.whatsapp} ~ '^[6-9][0-9]{9}$'`),
  ],
).enableRLS();

export const evaluations = pgTable(
  "evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id").references(() => registrations.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    projectUrl: text("project_url").notNull(),
    repoUrl: text("repo_url"),
    description: text("description"),
    scores: jsonb("scores").$type<Record<string, number>>().notNull(),
    total: integer("total").notNull(),
    mode: text("mode").notNull().default("basic"), // "ai" | "basic"
    feedback: text("feedback").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("evaluations_total_idx").on(t.total),
    index("evaluations_project_url_idx").on(t.projectUrl),
    check("evaluations_total_range", sql`${t.total} between 0 and 100`),
  ],
).enableRLS();

/** Small key/value store for admin-managed settings. Secret values are stored encrypted (see lib/crypto.ts). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

/** Uploaded files (student zips/videos, assessment attachments). Kept in Postgres so no extra storage service is needed. */
export const storedFiles = pgTable("stored_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export type Requirement = "required" | "optional" | "off";
/** "code" = a GitHub repo link and/or a zip upload (the student gives at least one when required). */
export type Requirements = { code: Requirement; hosted: Requirement; video: Requirement };

/** One assessment document. Many can exist at once (variants); a student is assigned one when they start. */
export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    brief: text("brief").notNull(), // markdown
    topic: text("topic"),
    source: text("source").notNull().default("manual"), // manual | upload | ai
    requirements: jsonb("requirements").$type<Requirements>().notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    attachmentFileId: uuid("attachment_file_id").references(() => storedFiles.id, { onDelete: "set null" }),
    // Set when the question was generated for exactly one student.
    generatedForId: uuid("generated_for_id").references((): AnyPgColumn => registrations.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("assessments_active_idx").on(t.active), check("assessments_duration", sql`${t.durationMinutes} between 5 and 600`)],
).enableRLS();

/** A student's one run at the challenge. The deadline is stored server-side — the browser timer is only a display. */
export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("attempts_registration_uq").on(t.registrationId), index("attempts_assessment_idx").on(t.assessmentId)],
).enableRLS();

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    repoUrl: text("repo_url"),
    hostedUrl: text("hosted_url"),
    videoUrl: text("video_url"),
    zipFileId: uuid("zip_file_id").references(() => storedFiles.id, { onDelete: "set null" }),
    videoFileId: uuid("video_file_id").references(() => storedFiles.id, { onDelete: "set null" }),
    notes: text("notes"),
    // LLM (or basic) scoring
    scores: jsonb("scores").$type<Record<string, number>>(),
    total: integer("total"),
    feedback: text("feedback"),
    scoreMode: text("score_mode"), // ai | basic
    scoreModel: text("score_model"),
    scoreError: text("score_error"),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("submissions_attempt_uq").on(t.attemptId), index("submissions_total_idx").on(t.total)],
).enableRLS();

/** One row per click on a share button (channel = whatsapp, linkedin, x, …). */
export const shares = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("shares_registration_idx").on(t.registrationId), index("shares_channel_idx").on(t.channel)],
).enableRLS();

export type College = typeof colleges.$inferSelect;
export type RegistrationRow = typeof registrations.$inferSelect;
export type EvaluationRow = typeof evaluations.$inferSelect;
