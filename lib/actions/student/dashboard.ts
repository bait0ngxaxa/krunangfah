"use server";

import { getViewerContext } from "@/lib/auth/viewer-context";
import { isSystemAdmin } from "@/lib/auth/session";
import { handleQueryError } from "@/lib/actions/error-handler";
import { queryEmpty, querySuccess, type QueryResult } from "@/lib/actions/query-result";
import { isRiskLevel } from "@/lib/constants/risk-levels";
import {
    getClassCountsQuery,
    getReferredStudentCountQuery,
    getRiskLevelCountsQuery,
    getStudentsForDashboardQuery,
    getUnscreenedStudentCountQuery,
} from "./queries";
import { isClassFilterAllowedForViewer } from "./student-scope";
import {
    getAvailableTermsQuery,
    getCurrentAcademicTermQuery,
} from "./term-queries";
import { transformRiskCounts } from "./transforms";
import type {
    StudentDashboardDataResponse,
    StudentDashboardQueryOptions,
} from "./types";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";

const DASHBOARD_PAGE_SIZE = 50;

interface ClassCount {
    class: string;
    _count: {
        class: number;
    };
}

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
        currentAcademicYearId: null,
        availableTerms: [],
        selectedTerm: null,
        currentAcademicYear: null,
        unscreenedThisYearCount: 0,
        unscreenedFilterApplied: false,
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

    return isRiskLevel(riskFilter) ? riskFilter : undefined;
}

function normalizePage(page?: number): number {
    if (!page || Number.isNaN(page)) {
        return 1;
    }

    return Math.max(1, Math.floor(page));
}

function normalizeAcademicYearId(value?: string): string | undefined {
    const trimmed = value?.trim();
    if (!trimmed) {
        return undefined;
    }

    const parsed = z.string().cuid().safeParse(trimmed);
    return parsed.success ? parsed.data : undefined;
}

function normalizeAssessmentRound(value?: number): number | undefined {
    return value === 1 || value === 2 ? value : undefined;
}

function buildClassOptions(
    baseClassCounts: ClassCount[],
    filteredClassCounts: ClassCount[],
): Array<{ name: string; count: number }> {
    const filteredCountByClass = new Map(
        filteredClassCounts.map((item) => [item.class, item._count.class]),
    );

    return baseClassCounts.map((item) => ({
        name: item.class,
        count: filteredCountByClass.get(item.class) ?? 0,
    }));
}

export async function getStudentDashboardData(
    options?: StudentDashboardQueryOptions,
): Promise<QueryResult<StudentDashboardDataResponse>> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && !isSystemAdmin(viewer.role)) {
            return { status: "forbidden" };
        }

        const scopeSchoolId = isSystemAdmin(viewer.role)
            ? options?.schoolId
            : viewer.schoolId;

        if (isSystemAdmin(viewer.role) && !scopeSchoolId) {
            return queryEmpty(createEmptyDashboardData());
        }

        const classFilter = normalizeClassFilter(options?.classFilter);
        // Another class in the URL must never reach a query for a class teacher.
        if (!isClassFilterAllowedForViewer(classFilter, viewer)) {
            return queryEmpty(createEmptyDashboardData());
        }
        const riskFilter = normalizeRiskFilter(options?.riskFilter);
        const page = normalizePage(options?.page);
        const referredOnly = options?.referredOnly === true;
        const academicYearId = normalizeAcademicYearId(
            options?.academicYearId,
        );
        const assessmentRound = normalizeAssessmentRound(
            options?.assessmentRound,
        );
        const [selectedAcademicYear, currentTerm] = await Promise.all([
            academicYearId
                ? prisma.academicYear.findUnique({
                      where: { id: academicYearId },
                      select: {
                          id: true,
                          year: true,
                          semester: true,
                          isCurrent: true,
                      },
                  })
                : Promise.resolve(null),
            getCurrentAcademicTermQuery(),
        ]);
        // `unscreened` is a default-view filter: a selected term wins, and with
        // no current term there is no "this academic year" to compare with.
        const isDefaultView = !academicYearId;
        const unscreenedYear =
            isDefaultView && options?.unscreenedThisYear === true
                ? currentTerm?.year
                : undefined;
        const unscreenedFilter =
            unscreenedYear !== undefined ? { unscreenedYear } : {};
        const currentPopulationOnly = academicYearId
            ? selectedAcademicYear?.isCurrent === true
            : true;
        const contextFilters = {
            ...(academicYearId ? { academicYearId } : {}),
            ...(assessmentRound ? { assessmentRound } : {}),
            ...(!currentPopulationOnly
                ? { currentPopulationOnly: false }
                : {}),
        };

        const [
            baseClassCounts,
            filteredClassCounts,
            rawRiskCounts,
            referredCount,
            unscreenedThisYearCount,
            availableTerms,
        ] = await Promise.all([
            getClassCountsQuery(
                scopeSchoolId,
                viewer.advisoryClass,
                viewer.role,
                viewer.userId,
                { referredOnly, ...unscreenedFilter, ...contextFilters },
            ),
            getClassCountsQuery(
                scopeSchoolId,
                viewer.advisoryClass,
                viewer.role,
                viewer.userId,
                {
                    referredOnly,
                    riskFilter,
                    ...unscreenedFilter,
                    ...contextFilters,
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
                    ...unscreenedFilter,
                    ...contextFilters,
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
                    ...unscreenedFilter,
                    ...contextFilters,
                },
            ),
            isDefaultView && currentTerm
                ? getUnscreenedStudentCountQuery(
                      scopeSchoolId,
                      viewer.advisoryClass,
                      viewer.role,
                      { classFilter, academicYear: currentTerm.year },
                  )
                : Promise.resolve(0),
            getAvailableTermsQuery(
                scopeSchoolId,
                viewer.advisoryClass,
                viewer.role,
            ),
        ]);

        const classes = baseClassCounts.map((item) => item.class);
        const classOptions = buildClassOptions(
            baseClassCounts,
            filteredClassCounts,
        );
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
                      ...unscreenedFilter,
                      ...contextFilters,
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

        const data: StudentDashboardDataResponse = {
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
            currentAcademicYearId: currentTerm?.id ?? null,
            availableTerms,
            currentAcademicYear: currentTerm?.year ?? null,
            unscreenedThisYearCount,
            unscreenedFilterApplied: unscreenedYear !== undefined,
            selectedTerm: selectedAcademicYear
                ? {
                      id: selectedAcademicYear.id,
                      year: selectedAcademicYear.year,
                      semester: selectedAcademicYear.semester,
                  }
                : null,
        };
        return data.totalStudents === 0 ? queryEmpty(data) : querySuccess(data);
    } catch (error) {
        return handleQueryError("Get student dashboard data error:", error);
    }
}
