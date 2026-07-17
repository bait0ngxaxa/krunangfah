ALTER TABLE "teacher_invites"
ADD COLUMN "rosterId" TEXT;

UPDATE "teacher_invites" AS invite
SET "rosterId" = roster."id"
FROM "school_teacher_roster" AS roster
WHERE invite."rosterId" IS NULL
  AND roster."schoolId" = invite."schoolId"
  AND roster."email" IS NOT NULL
  AND roster."email" = invite."email";

CREATE INDEX "teacher_invites_rosterId_idx"
ON "teacher_invites"("rosterId");

ALTER TABLE "teacher_invites"
ADD CONSTRAINT "teacher_invites_rosterId_fkey"
FOREIGN KEY ("rosterId") REFERENCES "school_teacher_roster"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
