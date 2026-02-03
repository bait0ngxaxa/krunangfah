/**
 * Student Main Actions
 * Public server actions with authentication
 */

"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
    getRiskLevelCountsQuery,
    getDistinctClassesQuery,
    getStudentsQuery,
    searchStudentsQuery,
    getStudentDetailQuery,
} from "./queries";
import { transformRiskCounts } from "./transforms";
import type {
    StudentListResponse,
    RiskCountsResponse,
    GetStudentsOptions,
} from "./types";

/**
 * Get risk level counts using database aggregation (fast)
 * Used for Pie Chart and summary
 */
export async function getStudentRiskCounts(
    classFilter?: string,
): Promise<RiskCountsResponse | null> {
    try {
        const session = await requireAuth();
        const user = session.user;

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { schoolId: true },
        });

        const schoolId = dbUser?.schoolId;
        if (!schoolId) return null;

        // Get classes and risk counts in parallel
        const [classes, rawCounts] = await Promise.all([
            getDistinctClassesQuery(schoolId, user.id, user.role),
            getRiskLevelCountsQuery(schoolId, user.id, user.role, classFilter),
        ]);

        return transformRiskCounts(rawCounts, classes);
    } catch (error) {
        console.error("Get student risk counts error:", error);
        return null;
    }
}

/**
 * Get students by class (for class_teacher) or all (for school_admin)
 * Supports pagination
 */
export async function getStudents(
    options?: GetStudentsOptions,
): Promise<StudentListResponse> {
    try {
        const session = await requireAuth();
        const user = session.user;

        const page = options?.page ?? 1;
        const limit = options?.limit ?? 100;
        const classFilter = options?.classFilter;

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { schoolId: true },
        });

        const schoolId = dbUser?.schoolId;

        if (!schoolId) {
            return {
                students: [],
                pagination: { total: 0, page, limit, totalPages: 0 },
            };
        }

        const { students, total } = await getStudentsQuery(
            schoolId,
            user.id,
            user.role,
            { classFilter, page, limit },
        );

        return {
            students,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error("Get students error:", error);
        return {
            students: [],
            pagination: { total: 0, page: 1, limit: 100, totalPages: 0 },
        };
    }
}

/**
 * Search students by name or student ID
 */
export async function searchStudents(query: string) {
    try {
        const session = await requireAuth();
        const user = session.user;

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { schoolId: true },
        });

        const schoolId = dbUser?.schoolId;
        if (!schoolId) return [];

        return searchStudentsQuery(schoolId, user.id, user.role, query);
    } catch (error) {
        console.error("Search students error:", error);
        return [];
    }
}

/**
 * Get student detail with all PHQ results
 */
export async function getStudentDetail(studentId: string) {
    try {
        const session = await requireAuth();
        const user = session.user;

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { schoolId: true },
        });

        const schoolId = dbUser?.schoolId;
        if (!schoolId) return null;

        return getStudentDetailQuery(schoolId, user.id, user.role, studentId);
    } catch (error) {
        console.error("Get student detail error:", error);
        return null;
    }
}
