-- Preserve every referral row while keeping a direct pointer to the active referral.
ALTER TABLE "student_referrals"
    ADD COLUMN "revokedAt" TIMESTAMP(3),
    ADD COLUMN "revokedById" TEXT,
    ADD COLUMN "revokeReason" TEXT,
    ADD COLUMN "closedAt" TIMESTAMP(3);

ALTER TABLE "students" ADD COLUMN "activeReferralId" TEXT;

UPDATE "students" AS student
SET "activeReferralId" = referral.id
FROM "student_referrals" AS referral
WHERE referral."studentId" = student.id;

DROP INDEX "student_referrals_studentId_key";

CREATE UNIQUE INDEX "students_activeReferralId_key"
    ON "students"("activeReferralId");

CREATE INDEX "student_referrals_studentId_createdAt_idx"
    ON "student_referrals"("studentId", "createdAt" DESC);

-- PostgreSQL partial uniqueness is the concurrency-safe active-referral invariant.
CREATE UNIQUE INDEX "student_referrals_one_active_per_student"
    ON "student_referrals"("studentId")
    WHERE "revokedAt" IS NULL AND "closedAt" IS NULL;

ALTER TABLE "students"
    ADD CONSTRAINT "students_activeReferralId_fkey"
    FOREIGN KEY ("activeReferralId")
    REFERENCES "student_referrals"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
