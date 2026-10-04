DROP INDEX "visits_visitor_day_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "visits_visitor_day_source_uq" ON "visits" USING btree ("visitor_id","day",coalesce("source", ''),"referred");