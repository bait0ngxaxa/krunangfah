CREATE INDEX "phq_results_studentId_academicYearId_createdAt_idx"
ON "phq_results"("studentId", "academicYearId", "createdAt" DESC);

CREATE INDEX "phq_results_academicYearId_createdAt_idx"
ON "phq_results"("academicYearId", "createdAt" DESC);
