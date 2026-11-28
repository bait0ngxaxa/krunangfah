import { Prisma } from "@prisma/client";
import { buildAttributedClassSql } from "@/lib/utils/class-attribution";
import { buildCurrentStudentPopulationSql } from "@/lib/utils/student-population";

// Raw SQL fragments shared by analytics queries. Callers alias phq_results
// as `pr`, students as `s`, schools as `sch` and academic_years as `ay`.

/**
 * Two class inputs with different meanings:
 * - scopeClass: a class teacher's visibility, always the student's current
 *   class (`s.class`), in every term.
 * - classFilter: a school/system admin's report selection, matched against
 *   the class at assessment time (see lib/utils/class-attribution).
 */
export interface AnalyticsClassScope {
    scopeClass?: string;
    classFilter?: string;
}

export function buildActiveStudentSchoolCondition(
    schoolId: string | undefined,
    currentPopulationOnly: boolean,
): Prisma.Sql {
    const lifecycleCondition = currentPopulationOnly
        ? buildCurrentStudentPopulationSql()
        : Prisma.empty;
    const schoolCondition = schoolId
        ? Prisma.sql`AND s."schoolId" = ${schoolId}`
        : Prisma.empty;

    return Prisma.sql`
        WHERE s."disabledAt" IS NULL
          AND s."isTestData" = false
          AND sch."disabledAt" IS NULL
          AND sch."isTestData" = false
          ${schoolCondition}
          ${lifecycleCondition}
    `;
}

export function buildClassConditions(classes: AnalyticsClassScope): Prisma.Sql {
    const scopeCondition = classes.scopeClass
        ? Prisma.sql`AND s.class = ${classes.scopeClass}`
        : Prisma.empty;
    const filterCondition = classes.classFilter
        ? Prisma.sql`AND ${buildAttributedClassSql()} = ${classes.classFilter}`
        : Prisma.empty;
    return Prisma.sql`${scopeCondition} ${filterCondition}`;
}

/**
 * The class a report groups by. A class teacher's view keeps the current
 * class so it is identical to before attribution existed.
 */
export function buildReportClassSql(classes: AnalyticsClassScope): Prisma.Sql {
    return classes.scopeClass ? Prisma.sql`s.class` : buildAttributedClassSql();
}

export function buildAcademicYearCondition(
    academicYearIds: readonly string[] | undefined,
): Prisma.Sql {
    if (!academicYearIds) return Prisma.empty;
    return academicYearIds.length > 0
        ? Prisma.sql`AND pr."academicYearId" IN (${Prisma.join(academicYearIds)})`
        : Prisma.sql`AND false`;
}

export function buildRoundCondition(assessmentRound: number | undefined): Prisma.Sql {
    return assessmentRound !== undefined
        ? Prisma.sql`AND pr."assessmentRound" = ${assessmentRound}`
        : Prisma.empty;
}
