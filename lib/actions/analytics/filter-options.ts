import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { buildAttributedClassWhere, buildAttributedClassSql } from "@/lib/utils/class-attribution";
import {
    buildActiveStudentSchoolCondition,
    buildClassConditions,
    buildRoundCondition,
    type AnalyticsClassScope,
} from "./query-conditions";

export interface SelectedAnalyticsTerm {
    id: string;
    isCurrent: boolean;
}

export interface RequestedAnalyticsTerm {
    academicYear?: number;
    semester?: number;
}

/** Prisma condition for "this result belongs to the selected class". */
export function buildResultClassWhere(
    classes: AnalyticsClassScope,
): Prisma.PhqResultWhereInput {
    if (classes.scopeClass) return { student: { class: classes.scopeClass } };
    if (classes.classFilter) return buildAttributedClassWhere(classes.classFilter);
    return {};
}

function buildScopedResultWhere(
    schoolId: string | undefined,
    classes: AnalyticsClassScope,
): Prisma.PhqResultWhereInput {
    return {
        AND: [
            {
                student: {
                    ...(schoolId ? { schoolId } : {}),
                    disabledAt: null,
                    isTestData: false,
                    school: { disabledAt: null, isTestData: false },
                },
            },
            buildResultClassWhere(classes),
        ],
    };
}

/** Terms with at least one result in scope (attributed to the class filter). */
export async function getAvailableAcademicTerms(
    schoolId: string | undefined,
    classes: AnalyticsClassScope,
): Promise<Array<{ id: string; year: number; semester: number }>> {
    return prisma.academicYear.findMany({
        where: { phqResults: { some: buildScopedResultWhere(schoolId, classes) } },
        select: { id: true, year: true, semester: true },
        distinct: ["year", "semester"],
        orderBy: [{ year: "desc" }, { semester: "asc" }],
    });
}

/** Rounds with at least one result in scope for the requested term(s). */
export async function getAvailableRounds(
    schoolId: string | undefined,
    classes: AnalyticsClassScope,
    term: RequestedAnalyticsTerm,
): Promise<number[]> {
    const termWhere: Prisma.PhqResultWhereInput =
        term.academicYear !== undefined || term.semester !== undefined
            ? {
                  academicYear: {
                      ...(term.academicYear !== undefined ? { year: term.academicYear } : {}),
                      ...(term.semester !== undefined ? { semester: term.semester } : {}),
                  },
              }
            : {};
    const rows = await prisma.phqResult.findMany({
        where: { AND: [buildScopedResultWhere(schoolId, classes), termWhere] },
        select: { assessmentRound: true },
        distinct: ["assessmentRound"],
        orderBy: { assessmentRound: "asc" },
    });
    return rows.map((row) => row.assessmentRound);
}

async function getCurrentClassNames(schoolId: string | undefined): Promise<string[]> {
    const rows = await prisma.schoolClass.findMany({
        where: {
            ...(schoolId ? { schoolId } : {}),
            archivedAt: null,
            school: { disabledAt: null, isTestData: false },
        },
        select: { name: true },
        orderBy: { name: "asc" },
    });
    return rows.map((row) => row.name);
}

/**
 * A past term lists the classes that existed then: its SchoolClassTerm rows
 * (archived classes included) plus every class its results are attributed
 * to. The current term and multi-term views list today's active classes.
 */
export async function getAvailableClassNames(
    schoolId: string | undefined,
    singleTerm: SelectedAnalyticsTerm | undefined,
): Promise<string[]> {
    if (!singleTerm || singleTerm.isCurrent) return getCurrentClassNames(schoolId);

    const classSchoolCondition = schoolId
        ? Prisma.sql`AND sc."schoolId" = ${schoolId}`
        : Prisma.empty;
    const rows = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM (
            SELECT sc.name
            FROM school_class_terms sct
            JOIN school_classes sc ON sct."schoolClassId" = sc.id
            JOIN schools sch ON sc."schoolId" = sch.id
            WHERE sct."academicYearId" = ${singleTerm.id}
              AND sch."disabledAt" IS NULL
              AND sch."isTestData" = false
              ${classSchoolCondition}
            UNION
            SELECT ${buildAttributedClassSql()} AS name
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            JOIN schools sch ON s."schoolId" = sch.id
            JOIN academic_years ay ON pr."academicYearId" = ay.id
            ${buildActiveStudentSchoolCondition(schoolId, false)}
              AND pr."academicYearId" = ${singleTerm.id}
        ) term_classes
        ORDER BY name ASC
    `;
    return rows.map((row) => row.name);
}

/**
 * True when a past term in scope has results imported before the class
 * snapshot existed; those are reported under the student's current class.
 */
export async function hasLegacyClassAttribution(input: {
    schoolId: string | undefined;
    classes: AnalyticsClassScope;
    singleTerm: SelectedAnalyticsTerm | undefined;
    assessmentRound: number | undefined;
}): Promise<boolean> {
    // A class teacher's view always uses the current class, so nothing differs.
    if (!input.singleTerm || input.singleTerm.isCurrent || input.classes.scopeClass) {
        return false;
    }

    const rows = await prisma.$queryRaw<Array<{ has_legacy: boolean }>>`
        SELECT EXISTS (
            SELECT 1
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            JOIN schools sch ON s."schoolId" = sch.id
            JOIN academic_years ay ON pr."academicYearId" = ay.id
            ${buildActiveStudentSchoolCondition(input.schoolId, false)}
              AND pr."academicYearId" = ${input.singleTerm.id}
              AND pr."className" IS NULL
              ${buildClassConditions(input.classes)}
              ${buildRoundCondition(input.assessmentRound)}
        ) AS has_legacy
    `;
    return rows[0]?.has_legacy === true;
}
