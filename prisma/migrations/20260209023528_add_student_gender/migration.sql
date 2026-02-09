-- CreateEnum
CREATE TYPE "gender" AS ENUM ('MALE', 'FEMALE');

-- DropIndex
DROP INDEX "idx_activity_phq_status_number";

-- DropIndex
DROP INDEX "idx_phq_activity_covering";

-- DropIndex
DROP INDEX "idx_phq_student_created_covering";

-- DropIndex
DROP INDEX "idx_phq_trend_covering";

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "gender" "gender";

-- CreateIndex
CREATE INDEX "activity_progress_phqResultId_status_idx" ON "activity_progress"("phqResultId", "status");

-- CreateIndex
CREATE INDEX "phq_results_studentId_createdAt_idx" ON "phq_results"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "phq_results_studentId_academicYearId_assessmentRound_idx" ON "phq_results"("studentId", "academicYearId", "assessmentRound");
