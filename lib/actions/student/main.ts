/**
 * Student Main Actions
 * Public server actions with authentication and caching
 */

"use server";

import { prisma } from "@/lib/database/prisma";
import { isSystemAdmin } from "@/lib/auth/session";
import { unstable_cache } from "next/cache";
import { getViewerContext } from "@/lib/auth/viewer-context";
import { maskNationalId } from "@/lib/utils/national-id";
import {
    getRiskLevelCountsQuery,
    getDistinctClassesQuery,
    getStudentsQuery,
    getStudentsForDashboardQuery,
    searchStudentsQuery,
    getStudentDetailQuery,
} from "./queries";
import { transformRiskCounts } from "./transforms";
import { handleQueryError } from "@/lib/actions/error-handler";
import {
    queryEmpty,
    queryForbidden,
    queryNotFound,
    querySuccess,
    type QueryResult,
} from "@/lib/actions/query-result";
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
} from "./cache";

// Note: Cache keys can be added here when implementing granular caching

/**
 * Get risk level counts using database aggregation (fast)
 * Cached for 30 seconds
 */
export async function getStudentRiskCounts(
    classFilter?: string,
): Promise<QueryResult<RiskCountsResponse>> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) {
            return queryForbidden();
        }

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

        const data = transformRiskCounts(rawCounts, classes);
        return data.total === 0 ? queryEmpty(data) : querySuccess(data);
    } catch (error) {
        return handleQueryError("Get student risk counts error:", error);
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
): Promise<QueryResult<StudentListResponse>> {
    try {
        const viewer = await getViewerContext();

        const page = options?.page ?? 1;
        const limit = options?.limit ?? 100;
        const classFilter = options?.classFilter;

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) {
            return queryForbidden();
        }

        if (page === 1 && !classFilter) {
            const data = await getCachedStudents(
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
            return data.pagination.total === 0
                ? queryEmpty(data)
                : querySuccess(data);
        }

        const { students, total } = await getStudentsQuery(
            viewer.schoolId,
            viewer.advisoryClass,
            viewer.role,
            viewer.userId,
            { classFilter, page, limit },
        );

        const data: StudentListResponse = {
            students,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
        return total === 0 ? queryEmpty(data) : querySuccess(data);
    } catch (error) {
        return handleQueryError("Get students error:", error);
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
): Promise<QueryResult<StudentWithLatestPhq[]>> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) {
            return queryForbidden();
        }

        const scopeSchoolId = isSystemAdmin(viewer.role)
            ? selectedSchoolId
            : viewer.schoolId;

        // system_admin must scope the dashboard to a selected school.
        if (isSystemAdmin(viewer.role) && !scopeSchoolId) {
            return queryEmpty([]);
        }

        const result = await getCachedStudentsForDashboard(
            scopeSchoolId,
            viewer.advisoryClass,
            viewer.role,
            viewer.userId,
        );

        return result.students.length === 0
            ? queryEmpty(result.students)
            : querySuccess(result.students);
    } catch (error) {
        return handleQueryError("Get students for dashboard error:", error);
    }
}

/**
 * Search by name/studentId within viewer scope.
 * Query is not cached because input is user-typed and highly dynamic.
 */
export async function searchStudents(
    query: string,
): Promise<QueryResult<Awaited<ReturnType<typeof searchStudentsQuery>>>> {
    try {
        // SECURITY: limit input length to keep search queries bounded
        const sanitizedQuery = (query ?? "").trim().slice(0, 100);
        if (!sanitizedQuery) return queryEmpty([]);

        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) {
            return queryForbidden();
        }
        const canViewNationalId = isSystemAdmin(viewer.role);

        const students = await searchStudentsQuery(
            viewer.schoolId,
            viewer.advisoryClass,
            viewer.role,
            viewer.userId,
            sanitizedQuery,
            canViewNationalId,
        );

        const sanitizedStudents = students.map((student) => ({
            ...student,
            nationalId: canViewNationalId ? maskNationalId(student.nationalId ?? null) : null,
        }));
        return sanitizedStudents.length === 0
            ? queryEmpty(sanitizedStudents)
            : querySuccess(sanitizedStudents);
    } catch (error) {
        return handleQueryError("Search students error:", error);
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

export async function getStudentDetail(
    studentId: string,
): Promise<Awaited<ReturnType<typeof getCachedStudentDetail>>> {
    const result = await getStudentDetailResult(studentId);
    if (result.status === "success") return result.data;
    if (result.status === "transient_error") {
        throw new Error(`Student detail query failed (${result.requestId})`);
    }
    return null;
}

export async function getStudentDetailResult(
    studentId: string,
): Promise<QueryResult<NonNullable<Awaited<ReturnType<typeof getCachedStudentDetail>>>>> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) {
            return queryForbidden();
        }

        const student = await getCachedStudentDetail(
            viewer.schoolId,
            viewer.advisoryClass,
            viewer.role,
            viewer.userId,
            studentId,
        );
        return student ? querySuccess(student) : queryNotFound();
    } catch (error) {
        return handleQueryError("Get student detail error:", error);
    }
}

/**
 * Guard import flow: round 2 is allowed only when round 1 exists in the same academic year.
 */
export async function hasRound1Data(
    academicYearId: string,
): Promise<QueryResult<boolean>> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) {
            return queryForbidden();
        }

        const count = await prisma.phqResult.count({
            where: {
                academicYearId,
                assessmentRound: 1,
                ...(viewer.schoolId ? { student: { schoolId: viewer.schoolId } } : {}),
            },
            take: 1,
        });

        return querySuccess(count > 0);
    } catch (error) {
        return handleQueryError("hasRound1Data error:", error);
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
): Promise<QueryResult<IncompleteActivityInfo>> {
    const noWarning: IncompleteActivityInfo = {
        hasIncomplete: false,
        studentCount: 0,
        activityCount: 0,
        previousRound: Math.max(assessmentRound - 1, 1),
    };

    // Round 1 has no previous round, so skip the warning entirely.
    if (classes.length === 0 || assessmentRound <= 1) {
        return querySuccess(noWarning);
    }

    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) {
            return queryForbidden();
        }

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

        if (incompleteActivities.length === 0) return querySuccess(noWarning);

        const uniqueStudents = new Set(
            incompleteActivities.map((a) => a.studentId),
        );

        return querySuccess({
            hasIncomplete: true,
            studentCount: uniqueStudents.size,
            activityCount: incompleteActivities.length,
            previousRound,
        });
    } catch (error) {
        return handleQueryError("getIncompleteActivityWarning error:", error);
    }
}

