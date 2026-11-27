-- Data-only: make academic term ranges contiguous Asia/Bangkok calendar days (UTC+07:00, no DST).
-- Semester 1 = 1 May - 31 Oct, semester 2 = 1 Nov - 30 Apr of the next AD year.
-- Columns are TIMESTAMP(3) holding UTC instants, so each bound is Bangkok midnight minus 7 hours.
-- Deterministic per (year, semester), therefore safe to re-run.
WITH "term_ranges" AS (
    SELECT
        "id",
        CASE "semester"
            WHEN 1 THEN make_timestamp("year" - 543, 5, 1, 0, 0, 0) - interval '7 hours'
            ELSE make_timestamp("year" - 543, 11, 1, 0, 0, 0) - interval '7 hours'
        END AS "startDate",
        CASE "semester"
            WHEN 1 THEN make_timestamp("year" - 543, 10, 31, 0, 0, 0) - interval '7 hours'
            ELSE make_timestamp("year" - 543 + 1, 4, 30, 0, 0, 0) - interval '7 hours'
        END AS "endDate"
    FROM "academic_years"
    WHERE "semester" IN (1, 2)
)
UPDATE "academic_years" AS "ay"
SET
    "startDate" = "term_ranges"."startDate",
    "endDate" = "term_ranges"."endDate",
    "updatedAt" = CURRENT_TIMESTAMP
FROM "term_ranges"
WHERE "ay"."id" = "term_ranges"."id"
    AND (
        "ay"."startDate" IS DISTINCT FROM "term_ranges"."startDate"
        OR "ay"."endDate" IS DISTINCT FROM "term_ranges"."endDate"
    );
