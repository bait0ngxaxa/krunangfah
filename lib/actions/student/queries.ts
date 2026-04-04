/**
 * Student Raw SQL Queries
 * Database-level queries for better performance
 *
 * Visibility for class_teacher:
 * - Students in advisoryClass only
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RiskCountRaw, StudentListResponse } from "./types";

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
}

function applyClassFilter(
    whereClause: Prisma.StudentWhereInput,
    classFilter?: string,
): void {
    if (!classFilter || classFilter === "all") {
        return;
    }

    if (whereClause.OR) {
        const existingOR = whereClause.OR;
        delete whereClause.OR;
        whereClause.AND = [
            { OR: existingOR as Prisma.StudentWhereInput[] },
            { class: classFilter },
        ];
        return;
    }

    whereClause.class = classFilter;
}

function applyReferredOnlyFilter(
    whereClause: Prisma.StudentWhereInput,
    referredOnly?: boolean,
): void {
    if (!referredOnly) {
        return;
    }

    const referredCondition: Prisma.StudentWhereInput = {
        referral: { isNot: null },
    };

    if (whereClause.AND) {
        whereClause.AND = [
            ...(whereClause.AND as Prisma.StudentWhereInput[]),
            referredCondition,
        ];
        return;
    }

    if (whereClause.OR) {
        const existingOR = whereClause.OR;
        delete whereClause.OR;
        whereClause.AND = [
            { OR: existingOR as Prisma.StudentWhereInput[] },
            referredCondition,
        ];
        return;
    }

    whereClause.referral = { isNot: null };
}

async function getStudentIdsByLatestRiskQuery(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string | undefined,
    riskFilter: string,
    classFilter?: string,
    referredOnly?: boolean,
): Promise<string[]> {
    const schoolCondition = schoolId
        ? Prisma.sql`WHERE s."schoolId" = ${schoolId}`
        : Prisma.sql`WHERE 1=1`;
    const teacherCondition =
        userRole === "class_teacher" && advisoryClass && userId
            ? Prisma.sql`AND s."class" = ${advisoryClass}`
            : Prisma.empty;
    const classCondition =
        classFilter && classFilter !== "all"
            ? Prisma.sql`AND s.class = ${classFilter}`
            : Prisma.empty;
    const referredCondition = referredOnly
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM student_referrals sr
            WHERE sr."studentId" = s.id
          )`
        : Prisma.empty;

    const rows = await prisma.$queryRaw<Array<{ student_id: string }>>`
        WITH ranked_phq AS (
            SELECT
                pr."studentId" AS student_id,
                pr."riskLevel",
                ROW_NUMBER() OVER (
                    PARTITION BY pr."studentId"
                    ORDER BY pr."createdAt" DESC
                ) AS rn
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            ${schoolCondition}
              ${teacherCondition}
              ${classCondition}
              ${referredCondition}
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
): Promise<boolean> {
    if (!riskFilter || riskFilter === "all") {
        return true;
    }

    const studentIds = await getStudentIdsByLatestRiskQuery(
        schoolId,
        advisoryClass,
        userRole,
        userId,
        riskFilter,
        classFilter,
        referredOnly,
    );

    if (studentIds.length === 0) {
        return false;
    }

    if (whereClause.AND) {
        whereClause.AND = [
            ...(whereClause.AND as Prisma.StudentWhereInput[]),
            { id: { in: studentIds } },
        ];
        return true;
    }

    whereClause.AND = [{ id: { in: studentIds } }];
    return true;
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
    const schoolCondition = schoolId
        ? Prisma.sql`WHERE s."schoolId" = ${schoolId}`
        : Prisma.sql`WHERE 1=1`;

    // class_teacher can see own advisory class plus students referred to them.
    const teacherCondition =
        userRole === "class_teacher" && advisoryClass && userId
            ? Prisma.sql`AND (
                (s."class" = ${advisoryClass} AND NOT EXISTS (
                    SELECT 1 FROM student_referrals sr WHERE sr."studentId" = s.id
                ))
                OR EXISTS (
                    SELECT 1 FROM student_referrals sr
                    WHERE sr."studentId" = s.id AND sr."toTeacherUserId" = ${userId}
                )
              )`
            : Prisma.empty;

    const classCondition =
        options?.classFilter && options.classFilter !== "all"
            ? Prisma.sql`AND s.class = ${options.classFilter}`
            : Prisma.empty;
    const referredCondition = options?.referredOnly
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM student_referrals sr
            WHERE sr."studentId" = s.id
          )`
        : Prisma.empty;

    return prisma.$queryRaw<RiskCountRaw[]>`
        WITH ranked_phq AS (
            SELECT
                pr."studentId",
                pr."riskLevel",
                ROW_NUMBER() OVER (
                    PARTITION BY pr."studentId"
                    ORDER BY pr."createdAt" DESC
                ) as rn
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            ${schoolCondition}
              ${teacherCondition}
              ${classCondition}
              ${referredCondition}
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
function buildReferralAwareWhere(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    _userId: string | undefined,
): Prisma.StudentWhereInput {
    const where: Prisma.StudentWhereInput = {
        ...(schoolId ? { schoolId } : {}),
    };

    if (userRole === "class_teacher" && advisoryClass) {
        where.class = advisoryClass;
    }

    return where;
}

/**
 * Get distinct classes for a school
 * Used for class filter dropdown
 */
export async function getDistinctClassesQuery(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string | undefined,
): Promise<string[]> {
    const where = buildReferralAwareWhere(schoolId, advisoryClass, userRole, userId);

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

    const whereClause = buildReferralAwareWhere(schoolId, advisoryClass, userRole, userId);

    applyClassFilter(whereClause, classFilter);

    // Count first to compute pagination metadata.
    const total = await prisma.student.count({ where: whereClause });

    // Fetch current page with stable ordering.
    const students = await prisma.student.findMany({
        where: whereClause,
        include: {
            phqResults: {
                orderBy: { createdAt: "desc" },
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
    },
): Promise<StudentListResponse> {
    const whereClause = buildReferralAwareWhere(
        schoolId,
        advisoryClass,
        userRole,
        userId,
    );
    const classFilter = options?.classFilter;
    const riskFilter = options?.riskFilter;
    const referredOnly = options?.referredOnly;
    const requestedPage = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, options?.limit ?? 50);

    applyClassFilter(whereClause, classFilter);
    applyReferredOnlyFilter(whereClause, referredOnly);

    const hasMatchingRiskStudents = await applyRiskFilterToWhereClause(
        whereClause,
        schoolId,
        advisoryClass,
        userRole,
        userId,
        riskFilter,
        classFilter,
        referredOnly,
    );

    if (!hasMatchingRiskStudents) {
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
    const students = await prisma.student.findMany({
        where: whereClause,
        include: {
            phqResults: {
                orderBy: { createdAt: "desc" },
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
    const whereClause = buildReferralAwareWhere(
        schoolId,
        advisoryClass,
        userRole,
        userId,
    );

    applyReferredOnlyFilter(whereClause, options?.referredOnly);

    const hasMatchingRiskStudents = await applyRiskFilterToWhereClause(
        whereClause,
        schoolId,
        advisoryClass,
        userRole,
        userId,
        options?.riskFilter,
        undefined,
        options?.referredOnly,
    );

    if (!hasMatchingRiskStudents) {
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
    const whereClause = buildReferralAwareWhere(
        schoolId,
        advisoryClass,
        userRole,
        userId,
    );

    applyClassFilter(whereClause, options?.classFilter);
    const hasMatchingRiskStudents = await applyRiskFilterToWhereClause(
        whereClause,
        schoolId,
        advisoryClass,
        userRole,
        userId,
        options?.riskFilter,
        options?.classFilter,
        undefined,
    );

    if (!hasMatchingRiskStudents) {
        return 0;
    }

    applyReferredOnlyFilter(whereClause, true);

    return prisma.student.count({
        where: whereClause,
    });
}

/**
 * Search students by name or student ID
 */
export async function searchStudentsQuery(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string | undefined,
    query: string,
) {
    const baseWhere = buildReferralAwareWhere(schoolId, advisoryClass, userRole, userId);

    const searchOR: Prisma.StudentWhereInput[] = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { studentId: { contains: query, mode: "insensitive" } },
    ];

    // Merge visibility scope with text-search predicates.
    const whereClause: Prisma.StudentWhereInput = {
        ...baseWhere,
    };

    if (baseWhere.OR) {
        // class_teacher keeps referral-aware visibility and applies search inside that scope.
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
        include: {
            phqResults: {
                orderBy: { createdAt: "desc" },
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
    const baseWhere = buildReferralAwareWhere(schoolId, advisoryClass, userRole, userId);

    const whereClause: Prisma.StudentWhereInput = {
        id: studentId,
        ...baseWhere,
    };

    return prisma.student.findFirst({
        where: whereClause,
        include: {
            phqResults: {
                include: {
                    academicYear: true,
                },
                orderBy: { createdAt: "desc" },
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
}
