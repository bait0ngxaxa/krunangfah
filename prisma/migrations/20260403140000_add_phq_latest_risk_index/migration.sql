CREATE INDEX "phq_results_studentId_createdAt_riskLevel_idx"
ON "phq_results"("studentId", "createdAt" DESC, "riskLevel");
