CREATE TYPE "public"."branch" AS ENUM('CSE', 'IT', 'AI & Data Science / ML', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Other');--> statement-breakpoint
CREATE TYPE "public"."study_year" AS ENUM('Final year (4th)', 'Pre-final year (3rd)', 'Recently graduated');--> statement-breakpoint
CREATE TABLE "colleges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "colleges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"state" text,
	"kind" text,
	"verified" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "colleges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid,
	"name" text NOT NULL,
	"project_url" text NOT NULL,
	"repo_url" text,
	"description" text,
	"scores" jsonb NOT NULL,
	"total" integer NOT NULL,
	"mode" text DEFAULT 'basic' NOT NULL,
	"feedback" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluations_total_range" CHECK ("evaluations"."total" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "evaluations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"whatsapp" text NOT NULL,
	"college_id" integer NOT NULL,
	"branch" "branch" NOT NULL,
	"year" "study_year" NOT NULL,
	"ref_code" text NOT NULL,
	"referred_by_id" uuid,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_no_self_referral" CHECK ("registrations"."referred_by_id" is null or "registrations"."referred_by_id" <> "registrations"."id"),
	CONSTRAINT "registrations_whatsapp_fmt" CHECK ("registrations"."whatsapp" ~ '^[6-9][0-9]{9}$')
);
--> statement-breakpoint
ALTER TABLE "registrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_referred_by_id_registrations_id_fk" FOREIGN KEY ("referred_by_id") REFERENCES "public"."registrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "colleges_slug_uq" ON "colleges" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "colleges_state_idx" ON "colleges" USING btree ("state");--> statement-breakpoint
CREATE INDEX "evaluations_total_idx" ON "evaluations" USING btree ("total");--> statement-breakpoint
CREATE INDEX "evaluations_project_url_idx" ON "evaluations" USING btree ("project_url");--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_email_uq" ON "registrations" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_whatsapp_uq" ON "registrations" USING btree ("whatsapp");--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_ref_code_uq" ON "registrations" USING btree ("ref_code");--> statement-breakpoint
CREATE INDEX "registrations_college_idx" ON "registrations" USING btree ("college_id");--> statement-breakpoint
CREATE INDEX "registrations_referred_by_idx" ON "registrations" USING btree ("referred_by_id");--> statement-breakpoint
CREATE INDEX "registrations_created_idx" ON "registrations" USING btree ("created_at");