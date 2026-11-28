/**
 * "No screening result this academic year": a worklist to find students
 * whose result was never imported, or who left without a status change.
 * Missing results never change a student's status by themselves.
 */

import { Prisma } from "@prisma/client";

/**
 * Students with at least one result, none of them in `academicYear` (both
 * semesters). A student with no result at all has no risk group to list
 * under, so the page could never show them.
 */
export function buildNoResultInAcademicYearWhere(
    academicYear: number,
): Prisma.StudentWhereInput {
    return {
        AND: [
            { phqResults: { some: {} } },
            { phqResults: { none: { academicYear: { year: academicYear } } } },
        ],
    };
}

/**
 * SQL twin for queries ranking `phq_results pr` joined to `students s`;
 * every such row already has a result, so only the "none" side is needed.
 */
export function buildNoResultInAcademicYearSql(
    academicYear: number | undefined,
): Prisma.Sql {
    if (academicYear === undefined) return Prisma.empty;
    return Prisma.sql`AND NOT EXISTS (
        SELECT 1 FROM phq_results upr
        JOIN academic_years uay ON upr."academicYearId" = uay.id
        WHERE upr."studentId" = s.id
          AND uay."year" = ${academicYear}
    )`;
}
