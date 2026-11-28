-- Audit: SchoolClassTerm rows that may have been created retroactively.
--
-- READ-ONLY. This script only SELECTs. It never inserts, updates or deletes.
--
-- Before the class-term read-path fix, opening a past term in the class
-- editor or the system-admin overview could create a term row for a class
-- that did not exist in that term. Such a row raises the past term's
-- screening-coverage denominator with no possible numerator.
--
-- A row listed here is only a suspect: a non-current term, for a class
-- created after that term ended. It can be legitimate, because an admin may
-- have deliberately added the class to the earlier term. Every row needs
-- human review before anyone decides to change or remove it.
--
-- Output contains no student data.

SELECT
    sc."schoolId"               AS school_id,
    sc.name                     AS class_name,
    ay.year                     AS year,
    ay.semester                 AS semester,
    sct."expectedStudentCount"  AS expected_student_count,
    sct."createdAt"             AS term_row_created_at,
    sc."createdAt"              AS class_created_at
FROM school_class_terms AS sct
JOIN school_classes AS sc ON sc.id = sct."schoolClassId"
JOIN academic_years AS ay ON ay.id = sct."academicYearId"
WHERE ay."isCurrent" = false
  AND sc."createdAt" > ay."endDate"
ORDER BY sc."schoolId", ay.year, ay.semester, sc.name;
