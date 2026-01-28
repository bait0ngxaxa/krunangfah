/*
  Warnings:

  - A unique constraint covering the columns `[studentId,academicYearId,assessmentRound]` on the table `phq_results` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "phq_results" ADD COLUMN     "assessmentRound" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "phq_results_studentId_academicYearId_assessmentRound_key" ON "phq_results"("studentId", "academicYearId", "assessmentRound");
