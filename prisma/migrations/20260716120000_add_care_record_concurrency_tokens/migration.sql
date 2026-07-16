ALTER TABLE "phq_results" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "phq_results" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "phq_results" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "student_referrals" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "student_referrals" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "student_referrals" ALTER COLUMN "updatedAt" SET NOT NULL;
