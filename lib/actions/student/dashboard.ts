"use server";

import { getViewerContext } from "@/lib/auth/viewer-context";
import { isSystemAdmin } from "@/lib/session";
import { logError } from "@/lib/utils/logging";
import {
    getClassCountsQuery,
    getReferredStudentCountQuery,
    getRiskLevelCountsQuery,
    getStudentsForDashboardQuery,
} from "./queries";
import { transformRiskCounts } from "./transforms";
import type {
    StudentDashboardDataResponse,
    StudentDashboardQueryOptions,
} from "./types";

const DASHBOARD_PAGE_SIZE = 50;
const VALID_RISK_FILTERS = new Set([
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
]);

function createEmptyDashboardData(): StudentDashboardDataResponse {
    return {
        students: [],
        classes: [],
        classOptions: [],
        riskCounts: { red: 0, orange: 0, yellow: 0, green: 0, blue: 0 },
        referredCount: 0,
        totalStudents: 0,
        filteredStudentCount: 0,
        pagination: {
            page: 1,
            limit: DASHBOARD_PAGE_SIZE,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
        },
    };
}

function normalizeClassFilter(classFilter?: string): string | undefined {
    if (!classFilter || classFilter === "all") {
        return undefined;
    }

    return classFilter;
}

function normalizeRiskFilter(riskFilter?: string): string | undefined {
    if (!riskFilter || riskFilter === "all") {
        return undefined;
    }

    return VALID_RISK_FILTERS.has(riskFilter) ? riskFilter : undefined;
}

function normalizePage(page?: number): number {
    if (!page || Number.isNaN(page)) {
        return 1;
    }

    return Math.max(1, Math.floor(page));
}

export async function getStudentDashboardData(
    options?: StudentDashboardQueryOptions,
): Promise<StudentDashboardDataResponse> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) {
            return createEmptyDashboardData();
        }

        const scopeSchoolId = isSystemAdmin(viewer.role)
            ? options?.schoolId
            : viewer.schoolId;

        if (isSystemAdmin(viewer.role) && !scopeSchoolId) {
            return createEmptyDashboardData();
        }

        const classFilter = normalizeClassFilter(options?.classFilter);
        const riskFilter = normalizeRiskFilter(options?.riskFilter);
        const page = normalizePage(options?.page);
        const referredOnly = options?.referredOnly === true;

        const [classCounts, rawRiskCounts, referredCount] = await Promise.all([
            getClassCountsQuery(
                scopeSchoolId,
                viewer.advisoryClass,
                viewer.role,
                viewer.userId,
                {
                    referredOnly,
                    riskFilter,
                },
            ),
            getRiskLevelCountsQuery(
                scopeSchoolId,
                viewer.advisoryClass,
                viewer.role,
                viewer.userId,
                {
                    classFilter,
                    referredOnly,
                },
            ),
            getReferredStudentCountQuery(
                scopeSchoolId,
                viewer.advisoryClass,
                viewer.role,
                viewer.userId,
                {
                    classFilter,
                    riskFilter,
                },
            ),
        ]);

        const classes = classCounts.map((item) => item.class);
        const classOptions = classCounts.map((item) => ({
            name: item.class,
            count: item._count.class,
        }));
        const riskCounts = transformRiskCounts(rawRiskCounts, classes);
        const shouldLoadStudents = Boolean(classFilter) || classes.length <= 1;
        const studentListResponse = shouldLoadStudents
            ? await getStudentsForDashboardQuery(
                  scopeSchoolId,
                  viewer.advisoryClass,
                  viewer.role,
                  viewer.userId,
                  {
                      classFilter,
                      riskFilter,
                      referredOnly,
                      page,
                      limit: DASHBOARD_PAGE_SIZE,
                  },
              )
            : {
                  students: [],
                  pagination: {
                      total: 0,
                      page: 1,
                      limit: DASHBOARD_PAGE_SIZE,
                      totalPages: 1,
                  },
              };

        return {
            students: studentListResponse.students,
            classes,
            classOptions,
            riskCounts: {
                red: riskCounts.red,
                orange: riskCounts.orange,
                yellow: riskCounts.yellow,
                green: riskCounts.green,
                blue: riskCounts.blue,
            },
            referredCount,
            totalStudents: riskCounts.total,
            filteredStudentCount: studentListResponse.pagination.total,
            pagination: {
                ...studentListResponse.pagination,
                hasNextPage:
                    studentListResponse.pagination.page <
                    studentListResponse.pagination.totalPages,
                hasPreviousPage: studentListResponse.pagination.page > 1,
            },
        };
    } catch (error) {
        logError("Get student dashboard data error:", error);
        return createEmptyDashboardData();
    }
}
