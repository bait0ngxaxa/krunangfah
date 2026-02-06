/**
 * Student Raw SQL Queries
 * Database-level queries for better performance
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
    schoolId: string,
    userId: string,
    userRole: string,
    classFilter?: string,
): Promise<RiskCountRaw[]> {
    // Build conditions
    const teacherCondition =
        userRole === "class_teacher"
            ? Prisma.sql`AND pr."importedById" = ${userId}`
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
            WHERE s."schoolId" = ${schoolId}
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
 * Get distinct classes for a school
 * Used for class filter dropdown
 */
export async function getDistinctClassesQuery(
    schoolId: string,
    userId: string,
    userRole: string,
): Promise<string[]> {
    const classesResult = await prisma.student.findMany({
        where: {
            schoolId,
            ...(userRole === "class_teacher"
                ? { phqResults: { some: { importedById: userId } } }
                : {}),
        },
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
    schoolId: string,
    userId: string,
    userRole: string,
    options: {
        classFilter?: string;
        page: number;
        limit: number;
    },
) {
    const { classFilter, page, limit } = options;

    const whereClause: Prisma.StudentWhereInput = { schoolId };

    if (userRole === "class_teacher") {
        whereClause.phqResults = {
            some: { importedById: userId },
        };
    }

    if (classFilter && classFilter !== "all") {
        whereClause.class = classFilter;
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
    schoolId: string,
    userId: string,
    userRole: string,
    query: string,
) {
    const whereClause: Prisma.StudentWhereInput = {
        schoolId,
        OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { studentId: { contains: query, mode: "insensitive" } },
        ],
    };

    if (userRole === "class_teacher") {
        whereClause.phqResults = {
            some: { importedById: userId },
        };
    }

    return prisma.student.findMany({
        where: whereClause,
        include: {
            phqResults: {
                orderBy: { createdAt: "desc" },
                take: 1,
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
    schoolId: string,
    userId: string,
    userRole: string,
    studentId: string,
) {
    const whereClause: Prisma.StudentWhereInput = {
        id: studentId,
        schoolId,
    };

    if (userRole === "class_teacher") {
        whereClause.phqResults = {
            some: { importedById: userId },
        };
    }

    return prisma.student.findFirst({
        where: whereClause,
        include: {
            phqResults: {
                include: {
                    academicYear: true,
                },
                orderBy: { createdAt: "desc" },
            },
        },
    });
}
