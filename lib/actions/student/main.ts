/**
 * Student Main Actions
 * Public server actions with authentication and caching
 */

"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, isSystemAdmin } from "@/lib/session";
import { unstable_cache, revalidateTag } from "next/cache";
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

// Note: Cache keys can be added here when implementing granular caching

/**
 * Get risk level counts using database aggregation (fast)
 * Cached for 30 seconds
 */
export async function getStudentRiskCounts(
    classFilter?: string
): Promise<RiskCountsResponse | null> {
    try {
        const session = await requireAuth();
        const user = session.user;

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { schoolId: true },
        });

        // system_admin can see all schools (schoolId = undefined)
        const schoolId = isSystemAdmin(user.role) ? undefined : (dbUser?.schoolId ?? undefined);
        if (!schoolId && !isSystemAdmin(user.role)) return null;

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
 * Supports pagination with caching
 */
const getCachedStudents = unstable_cache(
    async (
        schoolId: string | undefined,
        userId: string,
        userRole: string,
        options: GetStudentsOptions
    ) => {
        const page = options.page ?? 1;
        const limit = options.limit ?? 100;
        const { students, total } = await getStudentsQuery(
            schoolId,
            userId,
            userRole,
            { classFilter: options.classFilter, page, limit }
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
    },
    ["students-list"],
    {
        revalidate: 30, // Cache for 30 seconds
        tags: ["students"],
    }
);

export async function getStudents(
    options?: GetStudentsOptions
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

        // system_admin can see all schools (schoolId = undefined)
        const schoolId = isSystemAdmin(user.role) ? undefined : (dbUser?.schoolId ?? undefined);

        if (!schoolId && !isSystemAdmin(user.role)) {
            return {
                students: [],
                pagination: { total: 0, page, limit, totalPages: 0 },
            };
        }

        // Use cached data for first page, fresh data for pagination
        if (page === 1 && !classFilter) {
            return getCachedStudents(schoolId, user.id, user.role, {
                page,
                limit,
                classFilter,
            });
        }

        const { students, total } = await getStudentsQuery(
            schoolId,
            user.id,
            user.role,
            { classFilter, page, limit }
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
 * No caching for search (always fresh results)
 */
export async function searchStudents(query: string) {
    try {
        const session = await requireAuth();
        const user = session.user;

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { schoolId: true },
        });

        // system_admin can see all schools (schoolId = undefined)
        const schoolId = isSystemAdmin(user.role) ? undefined : (dbUser?.schoolId ?? undefined);
        if (!schoolId && !isSystemAdmin(user.role)) return [];

        return searchStudentsQuery(schoolId, user.id, user.role, query);
    } catch (error) {
        console.error("Search students error:", error);
        return [];
    }
}

/**
 * Get student detail with all PHQ results
 * Cached for 60 seconds
 */
const getCachedStudentDetail = unstable_cache(
    async (
        schoolId: string | undefined,
        userId: string,
        userRole: string,
        studentId: string
    ) => {
        return getStudentDetailQuery(schoolId, userId, userRole, studentId);
    },
    ["student-detail"],
    {
        revalidate: 60,
        tags: ["student-detail"],
    }
);

export async function getStudentDetail(studentId: string) {
    try {
        const session = await requireAuth();
        const user = session.user;

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { schoolId: true },
        });

        // system_admin can see all schools (schoolId = undefined)
        const schoolId = isSystemAdmin(user.role) ? undefined : (dbUser?.schoolId ?? undefined);
        if (!schoolId && !isSystemAdmin(user.role)) return null;

        return getCachedStudentDetail(schoolId, user.id, user.role, studentId);
    } catch (error) {
        console.error("Get student detail error:", error);
        return null;
    }
}

/**
 * Revalidate student cache after mutations
 */
export async function revalidateStudents() {
    revalidateTag("students", "default");
    revalidateTag("student-detail", "default");
}
