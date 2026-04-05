/**
 * Student Main Actions
 * Public server actions with authentication and caching
 */

"use server";

import { prisma } from "@/lib/prisma";
import { isSystemAdmin } from "@/lib/session";
import { unstable_cache } from "next/cache";
import { getViewerContext } from "@/lib/auth/viewer-context";
import {
    getRiskLevelCountsQuery,
    getDistinctClassesQuery,
    getStudentsQuery,
    getStudentsForDashboardQuery,
    searchStudentsQuery,
    getStudentDetailQuery,
} from "./queries";
import { transformRiskCounts } from "./transforms";
import { logError } from "@/lib/utils/logging";
import type {
    StudentListResponse,
    RiskCountsResponse,
    GetStudentsOptions,
    IncompleteActivityInfo,
    StudentWithLatestPhq,
} from "./types";
import {
    buildStudentDetailCacheKey,
    buildStudentsDashboardCacheKey,
    buildStudentsListCacheKey,
    getStudentDetailCacheTags,
    getStudentsCacheTags,
    revalidateStudentsCache,
} from "./cache";

// Note: Cache keys can be added here when implementing granular caching

/**
 * Get risk level counts using database aggregation (fast)
 * Cached for 30 seconds
 */
export async function getStudentRiskCounts(
    classFilter?: string,
): Promise<RiskCountsResponse | null> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) return null;

        // Get classes and risk counts in parallel
        const [classes, rawCounts] = await Promise.all([
            getDistinctClassesQuery(
                viewer.schoolId,
                viewer.advisoryClass,
                viewer.role,
                viewer.userId,
            ),
            getRiskLevelCountsQuery(
                viewer.schoolId,
                viewer.advisoryClass,
                viewer.role,
                viewer.userId,
                {
                    classFilter,
                },
            ),
        ]);

        return transformRiskCounts(rawCounts, classes);
    } catch (error) {
        logError("Get student risk counts error:", error);
        return null;
    }
}

/**
 * Return paginated student list in viewer scope.
 * First page without filters uses cache; other queries bypass cache for freshness.
 */
async function getCachedStudents(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string,
    options: GetStudentsOptions,
): Promise<StudentListResponse> {
    const cacheKey = buildStudentsListCacheKey({
        schoolId,
        advisoryClass,
        userRole,
        userId,
        options,
    });

    const cachedFetcher = unstable_cache(
        async () => {
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
        cacheKey,
        {
            revalidate: 30,
            tags: getStudentsCacheTags(schoolId),
        },
    );

    return cachedFetcher();
}

export async function getStudents(
    options?: GetStudentsOptions,
): Promise<StudentListResponse> {
    try {
        const viewer = await getViewerContext();

        const page = options?.page ?? 1;
        const limit = options?.limit ?? 100;
        const classFilter = options?.classFilter;

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) {
            return {
                students: [],
                pagination: { total: 0, page, limit, totalPages: 0 },
            };
        }

        if (page === 1 && !classFilter) {
            return getCachedStudents(
                viewer.schoolId,
                viewer.advisoryClass,
                viewer.role,
                viewer.userId,
                {
                    page,
                    limit,
                    classFilter,
                },
            );
        }

        const { students, total } = await getStudentsQuery(
            viewer.schoolId,
            viewer.advisoryClass,
            viewer.role,
            viewer.userId,
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
        logError("Get students error:", error);
        return {
            students: [],
            pagination: { total: 0, page: 1, limit: 100, totalPages: 0 },
        };
    }
}

async function getCachedStudentsForDashboard(
    scopeSchoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string,
) {
    const cacheKey = buildStudentsDashboardCacheKey({
        scopeSchoolId,
        advisoryClass,
        userRole,
        userId,
    });

    const cachedFetcher = unstable_cache(
        async () =>
            getStudentsForDashboardQuery(
                scopeSchoolId,
                advisoryClass,
                userRole,
                userId,
            ),
        cacheKey,
        {
            revalidate: 30,
            tags: getStudentsCacheTags(scopeSchoolId),
        },
    );

    return cachedFetcher();
}

export async function getStudentsForDashboard(
    selectedSchoolId?: string,
): Promise<StudentWithLatestPhq[]> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) {
            return [];
        }

        const scopeSchoolId = isSystemAdmin(viewer.role)
            ? selectedSchoolId
            : viewer.schoolId;

        // system_admin must scope the dashboard to a selected school.
        if (isSystemAdmin(viewer.role) && !scopeSchoolId) {
            return [];
        }

        const result = await getCachedStudentsForDashboard(
            scopeSchoolId,
            viewer.advisoryClass,
            viewer.role,
            viewer.userId,
        );

        return result.students;
    } catch (error) {
        logError("Get students for dashboard error:", error);
        return [];
    }
}

/**
 * Search by name/studentId within viewer scope.
 * Query is not cached because input is user-typed and highly dynamic.
 */
export async function searchStudents(query: string) {
    try {
        // SECURITY: limit input length to keep search queries bounded
        const sanitizedQuery = (query ?? "").trim().slice(0, 100);
        if (!sanitizedQuery) return [];

        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) return [];

        return searchStudentsQuery(
            viewer.schoolId,
            viewer.advisoryClass,
            viewer.role,
            viewer.userId,
            sanitizedQuery,
        );
    } catch (error) {
        logError("Search students error:", error);
        return [];
    }
}

/**
 * Load student detail (including PHQ history) in viewer scope.
 * Cached briefly to reduce repeated dashboard/detail reads.
 */
async function getCachedStudentDetail(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
    userId: string,
    studentId: string,
) {
    const cacheKey = buildStudentDetailCacheKey({
        schoolId,
        advisoryClass,
        userRole,
        userId,
        studentId,
    });

    const cachedFetcher = unstable_cache(
        async () =>
            getStudentDetailQuery(
                schoolId,
                advisoryClass,
                userRole,
                userId,
                studentId,
            ),
        cacheKey,
        {
            revalidate: 60,
            tags: getStudentDetailCacheTags(schoolId, studentId),
        },
    );

    return cachedFetcher();
}

export async function getStudentDetail(studentId: string) {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) return null;

        return getCachedStudentDetail(
            viewer.schoolId,
            viewer.advisoryClass,
            viewer.role,
            viewer.userId,
            studentId,
        );
    } catch (error) {
        logError("Get student detail error:", error);
        return null;
    }
}

/**
 * Guard import flow: round 2 is allowed only when round 1 exists in the same academic year.
 */
export async function hasRound1Data(academicYearId: string): Promise<boolean> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) return false;

        const count = await prisma.phqResult.count({
            where: {
                academicYearId,
                assessmentRound: 1,
                ...(viewer.schoolId ? { student: { schoolId: viewer.schoolId } } : {}),
            },
            take: 1,
        });

        return count > 0;
    } catch (error) {
        logError("hasRound1Data error:", error);
        return false;
    }
}

/**
 * Warn before import when previous-round activities are still incomplete.
 * The check is scoped to classes included in the incoming file (not whole school).
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

    // Round 1 has no previous round, so skip the warning entirely.
    if (classes.length === 0 || assessmentRound <= 1) return noWarning;

    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) return noWarning;

        const previousRound = assessmentRound - 1;
        const incompleteActivities = await prisma.activityProgress.findMany({
            where: {
                status: { not: "completed" },
                phqResult: {
                    academicYearId,
                    assessmentRound: previousRound,
                    student: {
                        ...(viewer.schoolId ? { schoolId: viewer.schoolId } : {}),
                        class: { in: classes },
                    },
                },
            },
            select: {
                studentId: true,
            },
        });

        if (incompleteActivities.length === 0) return noWarning;

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
        logError("getIncompleteActivityWarning error:", error);
        return noWarning;
    }
}

/**
 * Revalidate student cache after mutations
 */
export async function revalidateStudents() {
    revalidateStudentsCache();
}
