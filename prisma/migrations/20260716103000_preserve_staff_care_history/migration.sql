-- รักษาประวัติผู้สร้างก่อนเปลี่ยน FK เป็น nullable
ALTER TABLE "phq_results" ADD COLUMN "importedBySnapshot" JSONB;
ALTER TABLE "activity_progress" ADD COLUMN "teacherSnapshot" JSONB;
ALTER TABLE "worksheet_uploads" ADD COLUMN "uploadedBySnapshot" JSONB;
ALTER TABLE "counseling_sessions" ADD COLUMN "createdBySnapshot" JSONB;
ALTER TABLE "home_visits" ADD COLUMN "createdBySnapshot" JSONB;

UPDATE "phq_results" AS record
SET "importedBySnapshot" = jsonb_build_object(
  'id', actor."id", 'email', actor."email", 'name', actor."name", 'role', actor."role"
)
FROM "users" AS actor
WHERE record."importedById" = actor."id";

UPDATE "activity_progress" AS record
SET "teacherSnapshot" = jsonb_build_object(
  'id', actor."id", 'email', actor."email", 'name', actor."name", 'role', actor."role"
)
FROM "users" AS actor
WHERE record."teacherId" = actor."id";

UPDATE "worksheet_uploads" AS record
SET "uploadedBySnapshot" = jsonb_build_object(
  'id', actor."id", 'email', actor."email", 'name', actor."name", 'role', actor."role"
)
FROM "users" AS actor
WHERE record."uploadedById" = actor."id";

UPDATE "counseling_sessions" AS record
SET "createdBySnapshot" = jsonb_build_object(
  'id', actor."id", 'email', actor."email", 'name', actor."name", 'role', actor."role"
)
FROM "users" AS actor
WHERE record."createdById" = actor."id";

UPDATE "home_visits" AS record
SET "createdBySnapshot" = jsonb_build_object(
  'id', actor."id", 'email', actor."email", 'name', actor."name", 'role', actor."role"
)
FROM "users" AS actor
WHERE record."createdById" = actor."id";

ALTER TABLE "phq_results" ALTER COLUMN "importedById" DROP NOT NULL;
ALTER TABLE "worksheet_uploads" ALTER COLUMN "uploadedById" DROP NOT NULL;
ALTER TABLE "counseling_sessions" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "home_visits" ALTER COLUMN "createdById" DROP NOT NULL;

ALTER TABLE "phq_results" DROP CONSTRAINT "phq_results_importedById_fkey";
ALTER TABLE "activity_progress" DROP CONSTRAINT "activity_progress_teacherId_fkey";
ALTER TABLE "worksheet_uploads" DROP CONSTRAINT "worksheet_uploads_uploadedById_fkey";
ALTER TABLE "counseling_sessions" DROP CONSTRAINT "counseling_sessions_createdById_fkey";
ALTER TABLE "home_visits" DROP CONSTRAINT "home_visits_createdById_fkey";

ALTER TABLE "phq_results" ADD CONSTRAINT "phq_results_importedById_fkey"
  FOREIGN KEY ("importedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activity_progress" ADD CONSTRAINT "activity_progress_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "worksheet_uploads" ADD CONSTRAINT "worksheet_uploads_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "home_visits" ADD CONSTRAINT "home_visits_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
