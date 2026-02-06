-- Remove Duplicate Analytics Indexes
-- Old indexes from 20260203081125 are replaced by covering indexes

-- Drop old index: replaced by idx_phq_student_created_covering (with INCLUDE)
DROP INDEX IF EXISTS "phq_results_studentId_createdAt_idx";

-- Drop old index: replaced by idx_phq_trend_covering (with createdAt + INCLUDE)
DROP INDEX IF EXISTS "phq_results_studentId_academicYearId_assessmentRound_idx";

-- Drop old index: replaced by idx_activity_phq_status_number (with activityNumber)
DROP INDEX IF EXISTS "activity_progress_phqResultId_status_idx";

-- Note: Keep schema.prisma @@index definitions for documentation
-- Prisma will see indexes exist (our new ones) and skip creation
