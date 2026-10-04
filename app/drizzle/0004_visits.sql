CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" text NOT NULL,
	"day" date DEFAULT ((now() at time zone 'Asia/Kolkata')::date) NOT NULL,
	"source" text,
	"referred" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "visits_visitor_day_uq" ON "visits" USING btree ("visitor_id","day");--> statement-breakpoint
CREATE INDEX "visits_source_idx" ON "visits" USING btree ("source");