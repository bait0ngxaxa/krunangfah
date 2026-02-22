/**
 * Student Raw SQL Queries
 * Database-level queries for better performance
 *
 * Referral-aware visibility for class_teacher:
 * - Students in advisoryClass WITHOUT an active referral (not sent away), OR
 * - Students referred TO this teacher (regardless of class)
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RiskCountRaw } from "./types";

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
    classFilter?: string,
): Promise<RiskCountRaw[]> {
    // Build conditions
    const schoolCondition = schoolId
        ? Prisma.sql`WHERE s."schoolId" = ${schoolId}`
        : Prisma.sql`WHERE 1=1`;

    // Referral-aware teacher condition
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
        classFilter && classFilter !== "all"
            ? Prisma.sql`AND s.class = ${classFilter}`
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
        )
        SELECT "riskLevel" as risk_level, COUNT(*)::bigint as count
        FROM ranked_phq
        WHERE rn = 1
        GROUP BY "riskLevel"
    `;
}

/**
 * Build Prisma where clause for referral-aware class_teacher visibility
 */
function buildReferralAwareWhere(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string | undefined,
): Prisma.StudentWhereInput {
    const where: Prisma.StudentWhereInput = {
        ...(schoolId ? { schoolId } : {}),
    };

    if (userRole === "class_teacher" && advisoryClass && userId) {
        where.OR = [
            // Students in advisory class without referral
            {
                class: advisoryClass,
                referral: { is: null },
            },
            // Students referred to this teacher
            {
                referral: { toTeacherUserId: userId },
            },
        ];
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

    if (classFilter && classFilter !== "all") {
        // For class_teacher with referral-aware filter, wrap classFilter with AND
        if (whereClause.OR) {
            // Wrap existing OR in AND with classFilter
            const existingOR = whereClause.OR;
            delete whereClause.OR;
            whereClause.AND = [
                { OR: existingOR as Prisma.StudentWhereInput[] },
                { class: classFilter },
            ];
        } else {
            whereClause.class = classFilter;
        }
    }

    // Get total count
    const total = await prisma.student.count({ where: whereClause });

    // Get students with pagination
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

    // Combine visibility filter (from referral-aware) with search filter
    const whereClause: Prisma.StudentWhereInput = {
        ...baseWhere,
    };

    if (baseWhere.OR) {
        // class_teacher: AND visibility OR with search OR
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
