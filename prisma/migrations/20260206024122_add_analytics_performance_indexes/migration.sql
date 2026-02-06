-- Analytics Performance Optimization Indexes
-- Target: 100k+ phq_results, ~2400ms → ~800ms

-- ========================================
-- 1. Students Table
-- ========================================
-- For: WHERE s."schoolId" = $1 AND s.class = $2
CREATE INDEX IF NOT EXISTS "idx_students_school_class"
ON "students"("schoolId", "class");

-- ========================================
-- 2. PHQ Results Table - Covering Indexes
-- ========================================

-- For: getRiskLevelCounts, getGradeRiskData, getHospitalReferralsByGrade
-- DISTINCT ON (studentId) + SELECT riskLevel, referredToHospital
CREATE INDEX IF NOT EXISTS "idx_phq_student_created_covering"
ON "phq_results"("studentId", "createdAt" DESC)
INCLUDE ("riskLevel", "referredToHospital");

-- For: getTrendData
-- DISTINCT ON (studentId, academicYearId, assessmentRound)
CREATE INDEX IF NOT EXISTS "idx_phq_trend_covering"
ON "phq_results"("studentId", "academicYearId", "assessmentRound", "createdAt" DESC)
INCLUDE ("riskLevel");

-- For: getActivityProgressByRisk
-- Need: id, studentId, riskLevel (latest per student)
CREATE INDEX IF NOT EXISTS "idx_phq_activity_covering"
ON "phq_results"("studentId", "createdAt" DESC)
INCLUDE ("id", "riskLevel");

-- ========================================
-- 3. Activity Progress Table
-- ========================================
-- For: JOIN activity_progress WHERE status = 'completed'
CREATE INDEX IF NOT EXISTS "idx_activity_phq_status_number"
ON "activity_progress"("phqResultId", "status", "activityNumber");

-- Note: Existing index @@index([phqResultId, status]) will be kept
-- This new index is more specific for the GROUP BY activityNumber query