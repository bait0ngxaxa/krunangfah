-- CreateIndex
CREATE INDEX "activity_progress_phqResultId_status_idx" ON "activity_progress"("phqResultId", "status");

-- CreateIndex
CREATE INDEX "phq_results_studentId_createdAt_idx" ON "phq_results"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "phq_results_studentId_academicYearId_assessmentRound_idx" ON "phq_results"("studentId", "academicYearId", "assessmentRound");
