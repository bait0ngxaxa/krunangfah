-- Link counseling and home visit records to the selected academic year/semester.
ALTER TABLE "counseling_sessions" ADD COLUMN "academicYearId" TEXT;
ALTER TABLE "home_visits" ADD COLUMN "academicYearId" TEXT;

ALTER TABLE "counseling_sessions"
ADD CONSTRAINT "counseling_sessions_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "home_visits"
ADD CONSTRAINT "home_visits_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "counseling_sessions_academicYearId_idx" ON "counseling_sessions"("academicYearId");
CREATE INDEX "home_visits_academicYearId_idx" ON "home_visits"("academicYearId");
