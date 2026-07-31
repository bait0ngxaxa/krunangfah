-- Add a durable state for resuming the school setup wizard after a refresh.
CREATE TYPE "OnboardingStatus" AS ENUM (
    'PROFILE_REQUIRED',
    'SCHOOL_CREATED',
    'CLASSES_PENDING',
    'ROSTER_PENDING',
    'COMPLETED'
);

ALTER TABLE "users"
ADD COLUMN "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'PROFILE_REQUIRED';

-- Existing users already had access to the application, so preserve their
-- completed onboarding state while leaving users without a teacher profile in
-- the first onboarding state.
UPDATE "users" AS u
SET "onboardingStatus" = CASE
    WHEN u."schoolId" IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM "teachers" AS t
            WHERE t."userId" = u."id"
        ) THEN 'COMPLETED'::"OnboardingStatus"
    ELSE 'PROFILE_REQUIRED'::"OnboardingStatus"
END;
