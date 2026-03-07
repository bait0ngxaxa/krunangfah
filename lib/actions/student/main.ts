/**
 * Student Main Actions
 * Public server actions with authentication and caching
 */

"use server";

import { prisma } from "@/lib/prisma";
import { isSystemAdmin } from "@/lib/session";
import { unstable_cache, revalidateTag } from "next/cache";
import { getViewerContext } from "@/lib/auth/viewer-context";
import {
    getRiskLevelCountsQuery,
    getDistinctClassesQuery,
    getStudentsQuery,
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
} from "./types";

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
                classFilter,
            ),
        ]);

        return transformRiskCounts(rawCounts, classes);
    } catch (error) {
        logError("Get student risk counts error:", error);
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
        revalidate: 30,
        tags: ["students"],
    },
);

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

/**
 * Search students by name or student ID
 * No caching for search (always fresh results)
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
 * Check if round 1 PHQ data exists for the given academic year
 * Used to prevent importing round 2 before round 1
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
 * Check for incomplete activities from a previous assessment round
 * Used to warn teachers before importing new round data
 *
 * Scope by the imported class list from the Excel file.
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
    revalidateTag("students", "default");
    revalidateTag("student-detail", "default");
}
