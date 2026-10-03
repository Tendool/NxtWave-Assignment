ALTER TABLE "submissions" ADD COLUMN "reviews" jsonb;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "human_scores" jsonb;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "human_total" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "human_note" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "human_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "share_slug" text;--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_share_slug_uq" ON "submissions" USING btree ("share_slug");