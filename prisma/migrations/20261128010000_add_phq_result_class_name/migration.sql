-- Additive and nullable: results imported before this release keep "className" NULL.
-- No backfill: the system has no history of past classes, so any backfill would invent data.
ALTER TABLE "phq_results" ADD COLUMN "className" TEXT;
