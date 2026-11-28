/**
 * Student Raw SQL Queries
 * Database-level queries for better performance
 *
 * Visibility for class_teacher:
 * - Students in advisoryClass only
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import type { RiskCountRaw, StudentListResponse } from "./types";
import { getStudentReferralHistory } from "@/lib/services/student-referral-history";
import {
    LATEST_PHQ_ORDER_BY,
    LATEST_PHQ_SQL_ORDER_BY,
} from "@/lib/utils/phq-result-selection";
import {
    andStudentWhere,
    buildClassTeacherScopeSql,
    buildReferredStudentSql,
    buildReferredStudentWhere,
    buildCurrentStudentVisibilityWhere,
    buildStudentVisibilityWhere,
} from "./student-scope";
import { buildCurrentStudentPopulationSql } from "@/lib/utils/student-population";

/** The term a listed result came from, so rows can say which term it is. */
const RESULT_TERM_SELECT = {
    select: { id: true, year: true, semester: true },
} as const;

interface ClassCountRow {
    class: string;
    _count: {
        class: number;
    };
}

interface DashboardSummaryFilterOptions {
    classFilter?: string;
    riskFilter?: string;
    referredOnly?: boolean;
    academicYearId?: string;
    assessmentRound?: number;
    currentPopulationOnly?: boolean;
}

interface PhqContextFilterOptions {
    academicYearId?: string;
    assessmentRound?: number;
    currentPopulationOnly?: boolean;
}

function applyPhqContextFilter(
    whereClause: Prisma.StudentWhereInput,
    options?: PhqContextFilterOptions,
): Prisma.StudentWhereInput {
    if (!options?.academicYearId && !options?.assessmentRound) {
        return whereClause;
    }

    return andStudentWhere(whereClause, {
        phqResults: {
            some: {
                ...(options.academicYearId
                    ? { academicYearId: options.academicYearId }
                    : {}),
                ...(options.assessmentRound
                    ? { assessmentRound: options.assessmentRound }
                    : {}),
            },
        },
    });
}

function buildPhqContextSql(
    options?: PhqContextFilterOptions,
): Prisma.Sql {
    const academicYearCondition = options?.academicYearId
        ? Prisma.sql`AND pr."academicYearId" = ${options.academicYearId}`
        : Prisma.empty;
    const assessmentRoundCondition = options?.assessmentRound
        ? Prisma.sql`AND pr."assessmentRound" = ${options.assessmentRound}`
        : Prisma.empty;

    return Prisma.sql`${academicYearCondition} ${assessmentRoundCondition}`;
}

function buildActiveStudentSchoolCondition(
    schoolId: string | undefined,
    currentPopulationOnly: boolean,
): Prisma.Sql {
    const lifecycleCondition = currentPopulationOnly
        ? buildCurrentStudentPopulationSql()
        : Prisma.empty;

    if (schoolId) {
        return Prisma.sql`
            WHERE s."schoolId" = ${schoolId}
              AND s."disabledAt" IS NULL
              AND s."isTestData" = false
              AND sch."disabledAt" IS NULL
              AND sch."isTestData" = false
              ${lifecycleCondition}
        `;
    }

    return Prisma.sql`
        WHERE s."disabledAt" IS NULL
          AND s."isTestData" = false
          AND sch."disabledAt" IS NULL
          AND sch."isTestData" = false
          ${lifecycleCondition}
    `;
}

function applyClassFilter(
    whereClause: Prisma.StudentWhereInput,
    classFilter?: string,
): Prisma.StudentWhereInput {
    if (!classFilter || classFilter === "all") {
        return whereClause;
    }

    return andStudentWhere(whereClause, { class: classFilter });
}

function applyReferredOnlyFilter(
    whereClause: Prisma.StudentWhereInput,
    userRole: string,
    userId: string | undefined,
    referredOnly?: boolean,
): Prisma.StudentWhereInput {
    if (!referredOnly) {
        return whereClause;
    }

    return andStudentWhere(
        whereClause,
        buildReferredStudentWhere(userRole, userId),
    );
}

async function getStudentIdsByLatestRiskQuery(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string | undefined,
    riskFilter: string,
    classFilter?: string,
    referredOnly?: boolean,
    academicYearId?: string,
    assessmentRound?: number,
    currentPopulationOnly = true,
): Promise<string[]> {
    const schoolCondition = buildActiveStudentSchoolCondition(
        schoolId,
        currentPopulationOnly,
    );
    const teacherCondition = buildClassTeacherScopeSql(advisoryClass, userRole);
    const classCondition =
        classFilter && classFilter !== "all"
            ? Prisma.sql`AND s.class = ${classFilter}`
            : Prisma.empty;
    const referredCondition = referredOnly
        ? buildReferredStudentSql(userRole, userId)
        : Prisma.empty;
    const phqContextCondition = buildPhqContextSql({
        academicYearId,
        assessmentRound,
    });

    const rows = await prisma.$queryRaw<Array<{ student_id: string }>>`
        WITH ranked_phq AS (
            SELECT
                pr."studentId" AS student_id,
                pr."riskLevel",
                ROW_NUMBER() OVER (
                    PARTITION BY pr."studentId"
                    ORDER BY ${LATEST_PHQ_SQL_ORDER_BY}
                ) AS rn
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            JOIN schools sch ON s."schoolId" = sch.id
            JOIN academic_years ay ON pr."academicYearId" = ay.id
            ${schoolCondition}
              ${teacherCondition}
              ${classCondition}
              ${referredCondition}
              ${phqContextCondition}
        )
        SELECT student_id
        FROM ranked_phq
        WHERE rn = 1 AND "riskLevel" = CAST(${riskFilter} AS "RiskLevel")
    `;

    return rows.map((row) => row.student_id);
}

async function applyRiskFilterToWhereClause(
    whereClause: Prisma.StudentWhereInput,
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string | undefined,
    riskFilter?: string,
    classFilter?: string,
    referredOnly?: boolean,
    academicYearId?: string,
    assessmentRound?: number,
    currentPopulationOnly = true,
): Promise<Prisma.StudentWhereInput | null> {
    if (!riskFilter || riskFilter === "all") {
        return whereClause;
    }

    const studentIds = await getStudentIdsByLatestRiskQuery(
        schoolId,
        advisoryClass,
        userRole,
        userId,
        riskFilter,
        classFilter,
        referredOnly,
        academicYearId,
        assessmentRound,
        currentPopulationOnly,
    );

    if (studentIds.length === 0) {
        return null;
    }

    return andStudentWhere(whereClause, { id: { in: studentIds } });
}

/**
 * Get risk level counts using database aggregation
 * Used for Pie Chart summary - much faster than loading all students
 * Optimized: Uses ROW_NUMBER() instead of DISTINCT ON for better performance
 */
export async function getRiskLevelCountsQuery(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string | undefined,
    options?: DashboardSummaryFilterOptions,
): Promise<RiskCountRaw[]> {
    // Build base visibility scope from role + school context.
    const schoolCondition = buildActiveStudentSchoolCondition(
        schoolId,
        options?.currentPopulationOnly !== false,
    );

    const teacherCondition = buildClassTeacherScopeSql(advisoryClass, userRole);

    const classCondition =
        options?.classFilter && options.classFilter !== "all"
            ? Prisma.sql`AND s.class = ${options.classFilter}`
            : Prisma.empty;
    const referredCondition = options?.referredOnly
        ? buildReferredStudentSql(userRole, userId)
        : Prisma.empty;
    const phqContextCondition = buildPhqContextSql(options);

    return prisma.$queryRaw<RiskCountRaw[]>`
        WITH ranked_phq AS (
            SELECT
                pr."studentId",
                pr."riskLevel",
                ROW_NUMBER() OVER (
                    PARTITION BY pr."studentId"
                    ORDER BY ${LATEST_PHQ_SQL_ORDER_BY}
                ) as rn
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            JOIN schools sch ON s."schoolId" = sch.id
            JOIN academic_years ay ON pr."academicYearId" = ay.id
            ${schoolCondition}
              ${teacherCondition}
              ${classCondition}
              ${referredCondition}
              ${phqContextCondition}
        )
        SELECT "riskLevel" as risk_level, COUNT(*)::bigint as count
        FROM ranked_phq
        WHERE rn = 1
        GROUP BY "riskLevel"
    `;
}

/**
 * Build Prisma where clause for class_teacher visibility
 */
/**
 * Get distinct classes for a school
 * Used for class filter dropdown
 */
export async function getDistinctClassesQuery(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    _userId: string | undefined,
): Promise<string[]> {
    const where = buildCurrentStudentVisibilityWhere(
        schoolId,
        advisoryClass,
        userRole,
    );

    const classesResult = await prisma.student.findMany({
        where,
        select: { class: true },
        distinct: ["class"],
        orderBy: { class: "asc" },
    });

    return classesResult.map((c) => c.class);
}

/**
 * Get students with pagination
 */
export async function getStudentsQuery(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string | undefined,
    options: {
        classFilter?: string;
        page: number;
        limit: number;
    },
) {
    const { classFilter, page, limit } = options;

    const whereClause = applyClassFilter(
        buildCurrentStudentVisibilityWhere(schoolId, advisoryClass, userRole),
        classFilter,
    );

    // Count first to compute pagination metadata.
    const total = await prisma.student.count({ where: whereClause });

    // Fetch current page with stable ordering.
    const students = await prisma.student.findMany({
        where: whereClause,
        omit: { nationalId: true },
        include: {
            phqResults: {
                include: { academicYear: RESULT_TERM_SELECT },
                orderBy: LATEST_PHQ_ORDER_BY,
                take: 1,
            },
            referral: {
                select: {
                    id: true,
                    fromTeacherUserId: true,
                    toTeacherUserId: true,
                },
            },
        },
        orderBy: [{ class: "asc" }, { firstName: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
    });

    return { students, total };
}

/**
 * Get visible students for dashboard filtering with pagination.
 */
export async function getStudentsForDashboardQuery(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string | undefined,
    options?: {
        classFilter?: string;
        riskFilter?: string;
        referredOnly?: boolean;
        page?: number;
        limit?: number;
        academicYearId?: string;
        assessmentRound?: number;
        currentPopulationOnly?: boolean;
    },
): Promise<StudentListResponse> {
    const visibilityWhere = options?.currentPopulationOnly === false
        ? buildStudentVisibilityWhere(schoolId, advisoryClass, userRole)
        : buildCurrentStudentVisibilityWhere(
              schoolId,
              advisoryClass,
              userRole,
          );
    const classFilter = options?.classFilter;
    const riskFilter = options?.riskFilter;
    const referredOnly = options?.referredOnly;
    const academicYearId = options?.academicYearId;
    const assessmentRound = options?.assessmentRound;
    const requestedPage = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, options?.limit ?? 50);

    const filteredWhere = applyPhqContextFilter(
        applyReferredOnlyFilter(
            applyClassFilter(visibilityWhere, classFilter),
            userRole,
            userId,
            referredOnly,
        ),
        { academicYearId, assessmentRound },
    );

    const whereClause = await applyRiskFilterToWhereClause(
        filteredWhere,
        schoolId,
        advisoryClass,
        userRole,
        userId,
        riskFilter,
        classFilter,
        referredOnly,
        academicYearId,
        assessmentRound,
        options?.currentPopulationOnly !== false,
    );

    if (!whereClause) {
        return {
            students: [],
            pagination: {
                total: 0,
                page: 1,
                limit,
                totalPages: 1,
            },
        };
    }

    const total = await prisma.student.count({
        where: whereClause,
    });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, totalPages);
    const phqContextWhere =
        academicYearId || assessmentRound
            ? {
                  ...(academicYearId ? { academicYearId } : {}),
                  ...(assessmentRound ? { assessmentRound } : {}),
              }
            : undefined;
    const students = await prisma.student.findMany({
        where: whereClause,
        omit: { nationalId: true },
        include: {
            phqResults: {
                ...(phqContextWhere ? { where: phqContextWhere } : {}),
                include: { academicYear: RESULT_TERM_SELECT },
                orderBy: LATEST_PHQ_ORDER_BY,
                take: 1,
            },
            referral: {
                select: {
                    id: true,
                    fromTeacherUserId: true,
                    toTeacherUserId: true,
                },
            },
        },
        orderBy: [{ class: "asc" }, { firstName: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
    });

    return {
        students,
        pagination: {
            total,
            page,
            limit,
            totalPages,
        },
    };
}

export async function getClassCountsQuery(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string | undefined,
    options?: DashboardSummaryFilterOptions,
): Promise<ClassCountRow[]> {
    const visibilityWhere = options?.currentPopulationOnly === false
        ? buildStudentVisibilityWhere(schoolId, advisoryClass, userRole)
        : buildCurrentStudentVisibilityWhere(
              schoolId,
              advisoryClass,
              userRole,
          );

    const filteredWhere = applyPhqContextFilter(
        applyReferredOnlyFilter(
            visibilityWhere,
            userRole,
            userId,
            options?.referredOnly,
        ),
        options,
    );

    const whereClause = await applyRiskFilterToWhereClause(
        filteredWhere,
        schoolId,
        advisoryClass,
        userRole,
        userId,
        options?.riskFilter,
        undefined,
        options?.referredOnly,
        options?.academicYearId,
        options?.assessmentRound,
        options?.currentPopulationOnly !== false,
    );

    if (!whereClause) {
        return [];
    }

    const classCounts = await prisma.student.groupBy({
        by: ["class"],
        where: whereClause,
        _count: {
            class: true,
        },
        orderBy: {
            class: "asc",
        },
    });

    return classCounts as ClassCountRow[];
}

export async function getReferredStudentCountQuery(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string | undefined,
    options?: DashboardSummaryFilterOptions,
): Promise<number> {
    const visibilityWhere = options?.currentPopulationOnly === false
        ? buildStudentVisibilityWhere(schoolId, advisoryClass, userRole)
        : buildCurrentStudentVisibilityWhere(
              schoolId,
              advisoryClass,
              userRole,
          );

    const filteredWhere = applyPhqContextFilter(
        applyClassFilter(visibilityWhere, options?.classFilter),
        options,
    );
    const whereClause = await applyRiskFilterToWhereClause(
        filteredWhere,
        schoolId,
        advisoryClass,
        userRole,
        userId,
        options?.riskFilter,
        options?.classFilter,
        undefined,
        options?.academicYearId,
        options?.assessmentRound,
        options?.currentPopulationOnly !== false,
    );

    if (!whereClause) {
        return 0;
    }

    return prisma.student.count({
        where: applyReferredOnlyFilter(whereClause, userRole, userId, true),
    });
}

/**
 * Search students by name or student ID, plus national ID for system admins only.
 */
export async function searchStudentsQuery(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string | undefined,
    query: string,
    allowNationalIdSearch: boolean,
) {
    const baseWhere = buildStudentVisibilityWhere(
        schoolId,
        advisoryClass,
        userRole,
    );

    const searchOR: Prisma.StudentWhereInput[] = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { studentId: { contains: query, mode: "insensitive" } },
    ];
    if (allowNationalIdSearch) {
        searchOR.push({
            nationalId: { contains: query, mode: "insensitive" },
        });
    }

    // Merge visibility scope with text-search predicates.
    const whereClause: Prisma.StudentWhereInput = {
        ...baseWhere,
    };

    if (baseWhere.OR) {
        const visibilityOR = baseWhere.OR;
        delete whereClause.OR;
        whereClause.AND = [
            { OR: visibilityOR as Prisma.StudentWhereInput[] },
            { OR: searchOR },
        ];
    } else {
        whereClause.OR = searchOR;
    }

    return prisma.student.findMany({
        where: whereClause,
        omit: { nationalId: !allowNationalIdSearch },
        include: {
            school: {
                select: {
                    name: true,
                },
            },
            phqResults: {
                orderBy: LATEST_PHQ_ORDER_BY,
                take: 1,
            },
            referral: {
                select: {
                    id: true,
                    fromTeacherUserId: true,
                    toTeacherUserId: true,
                },
            },
        },
        orderBy: [{ class: "asc" }, { firstName: "asc" }],
        take: 50,
    });
}

/**
 * Get student detail with all PHQ results
 */
export async function getStudentDetailQuery(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string | undefined,
    studentId: string,
) {
    const baseWhere = buildStudentVisibilityWhere(
        schoolId,
        advisoryClass,
        userRole,
    );

    const whereClause: Prisma.StudentWhereInput = {
        id: studentId,
        ...baseWhere,
    };

    const student = await prisma.student.findFirst({
        where: whereClause,
        omit: { nationalId: true },
        include: {
            school: {
                select: {
                    name: true,
                },
            },
            phqResults: {
                include: {
                    academicYear: true,
                },
                orderBy: LATEST_PHQ_ORDER_BY,
            },
            referral: {
                include: {
                    fromTeacher: {
                        select: {
                            teacher: {
                                select: { firstName: true, lastName: true },
                            },
                        },
                    },
                    toTeacher: {
                        select: {
                            teacher: {
                                select: { firstName: true, lastName: true },
                            },
                        },
                    },
                },
            },
        },
    });
    if (!student) return null;

    const referralHistory = await getStudentReferralHistory(student.id, whereClause);
    return { ...student, referralHistory };
}
