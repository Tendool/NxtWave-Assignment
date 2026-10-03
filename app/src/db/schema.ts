import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
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
    referredById: uuid("referred_by_id").references((): AnyPgColumn => registrations.id, { onDelete: "set null" }),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("registrations_email_uq").on(sql`lower(${t.email})`),
    uniqueIndex("registrations_whatsapp_uq").on(t.whatsapp),
    uniqueIndex("registrations_ref_code_uq").on(t.refCode),
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

export type College = typeof colleges.$inferSelect;
export type RegistrationRow = typeof registrations.$inferSelect;
export type EvaluationRow = typeof evaluations.$inferSelect;
