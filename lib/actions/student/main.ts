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
    IncompleteActivityInfo,
} from "./types";

// Note: Cache keys can be added here when implementing granular caching

/**
 * Fetch user context (schoolId, advisoryClass) needed by query functions
 */
async function getUserContext(userId: string, userRole: string) {
    const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            schoolId: true,
            teacher: { select: { advisoryClass: true } },
        },
    });

    const schoolId = isSystemAdmin(userRole)
        ? undefined
        : (dbUser?.schoolId ?? undefined);
    const advisoryClass = dbUser?.teacher?.advisoryClass ?? undefined;

    return { schoolId, advisoryClass };
}

/**
 * Get risk level counts using database aggregation (fast)
 * Cached for 30 seconds
 */
export async function getStudentRiskCounts(
    classFilter?: string,
): Promise<RiskCountsResponse | null> {
    try {
        const session = await requireAuth();
        const user = session.user;
        const { schoolId, advisoryClass } = await getUserContext(
            user.id,
            user.role,
        );

        if (!schoolId && !isSystemAdmin(user.role)) return null;

        // Get classes and risk counts in parallel
        const [classes, rawCounts] = await Promise.all([
            getDistinctClassesQuery(
                schoolId,
                advisoryClass,
                user.role,
                user.id,
            ),
            getRiskLevelCountsQuery(
                schoolId,
                advisoryClass,
                user.role,
                user.id,
                classFilter,
            ),
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
        advisoryClass: string | undefined,
        userRole: string,
        userId: string,
        options: GetStudentsOptions,
    ) => {
        const page = options.page ?? 1;
        const limit = options.limit ?? 100;
        const { students, total } = await getStudentsQuery(
            schoolId,
            advisoryClass,
            userRole,
            userId,
            { classFilter: options.classFilter, page, limit },
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
    },
);

export async function getStudents(
    options?: GetStudentsOptions,
): Promise<StudentListResponse> {
    try {
        const session = await requireAuth();
        const user = session.user;

        const page = options?.page ?? 1;
        const limit = options?.limit ?? 100;
        const classFilter = options?.classFilter;

        const { schoolId, advisoryClass } = await getUserContext(
            user.id,
            user.role,
        );

        if (!schoolId && !isSystemAdmin(user.role)) {
            return {
                students: [],
                pagination: { total: 0, page, limit, totalPages: 0 },
            };
        }

        // Use cached data for first page, fresh data for pagination
        if (page === 1 && !classFilter) {
            return getCachedStudents(
                schoolId,
                advisoryClass,
                user.role,
                user.id,
                {
                    page,
                    limit,
                    classFilter,
                },
            );
        }

        const { students, total } = await getStudentsQuery(
            schoolId,
            advisoryClass,
            user.role,
            user.id,
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
 * No caching for search (always fresh results)
 */
export async function searchStudents(query: string) {
    try {
        // SECURITY: จำกัดความยาว input ป้องกัน query ที่ใหญ่เกินไป
        const sanitizedQuery = (query ?? "").trim().slice(0, 100);
        if (!sanitizedQuery) return [];

        const session = await requireAuth();
        const user = session.user;
        const { schoolId, advisoryClass } = await getUserContext(
            user.id,
            user.role,
        );

        if (!schoolId && !isSystemAdmin(user.role)) return [];

        return searchStudentsQuery(
            schoolId,
            advisoryClass,
            user.role,
            user.id,
            sanitizedQuery,
        );
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
        advisoryClass: string | undefined,
        userRole: string,
        userId: string,
        studentId: string,
    ) => {
        return getStudentDetailQuery(
            schoolId,
            advisoryClass,
            userRole,
            userId,
            studentId,
        );
    },
    ["student-detail"],
    {
        revalidate: 60,
        tags: ["student-detail"],
    },
);

export async function getStudentDetail(studentId: string) {
    try {
        const session = await requireAuth();
        const user = session.user;
        const { schoolId, advisoryClass } = await getUserContext(
            user.id,
            user.role,
        );

        if (!schoolId && !isSystemAdmin(user.role)) return null;

        return getCachedStudentDetail(
            schoolId,
            advisoryClass,
            user.role,
            user.id,
            studentId,
        );
    } catch (error) {
        console.error("Get student detail error:", error);
        return null;
    }
}

/**
 * Check if round 1 PHQ data exists for the given academic year
 * Used to prevent importing round 2 before round 1
 */
export async function hasRound1Data(academicYearId: string): Promise<boolean> {
    try {
        const session = await requireAuth();
        const user = session.user;
        const { schoolId } = await getUserContext(user.id, user.role);

        if (!schoolId && !isSystemAdmin(user.role)) return false;

        const count = await prisma.phqResult.count({
            where: {
                academicYearId,
                assessmentRound: 1,
                ...(schoolId ? { student: { schoolId } } : {}),
            },
            take: 1,
        });

        return count > 0;
    } catch (error) {
        console.error("hasRound1Data error:", error);
        return false;
    }
}

/**
 * Check for incomplete activities from a previous assessment round
 * Used to warn teachers before importing new round data
 *
 * Scoping by `classes` — the classes of students being imported (from Excel)
 * This way both school_admin and class_teacher get warnings scoped to
 * exactly the classes they are importing, not the entire school.
 */
export async function getIncompleteActivityWarning(
    academicYearId: string,
    assessmentRound: number,
    classes: string[],
): Promise<IncompleteActivityInfo> {
    const noWarning: IncompleteActivityInfo = {
        hasIncomplete: false,
        studentCount: 0,
        activityCount: 0,
        previousRound: Math.max(assessmentRound - 1, 1),
    };

    // Round 1 has no previous round — skip warning entirely
    if (classes.length === 0 || assessmentRound <= 1) return noWarning;

    try {
        const session = await requireAuth();
        const user = session.user;
        const { schoolId } = await getUserContext(user.id, user.role);

        if (!schoolId && !isSystemAdmin(user.role)) return noWarning;

        // Check the previous round's incomplete activities
        // e.g. importing round 2 → check round 1
        const previousRound = assessmentRound - 1;

        // Find incomplete activities for students in the imported classes only
        const incompleteActivities = await prisma.activityProgress.findMany({
            where: {
                status: { not: "completed" },
                phqResult: {
                    academicYearId,
                    assessmentRound: previousRound,
                    student: {
                        ...(schoolId ? { schoolId } : {}),
                        class: { in: classes },
                    },
                },
            },
            select: {
                studentId: true,
            },
        });

        if (incompleteActivities.length === 0) return noWarning;

        // Count distinct students
        const uniqueStudents = new Set(
            incompleteActivities.map((a) => a.studentId),
        );

        return {
            hasIncomplete: true,
            studentCount: uniqueStudents.size,
            activityCount: incompleteActivities.length,
            previousRound,
        };
    } catch (error) {
        console.error("getIncompleteActivityWarning error:", error);
        return noWarning;
    }
}

/**
 * Revalidate student cache after mutations
 */
export async function revalidateStudents() {
    revalidateTag("students", "default");
    revalidateTag("student-detail", "default");
}
