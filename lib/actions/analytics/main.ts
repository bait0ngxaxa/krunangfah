"use server";

import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getViewerContext } from "@/lib/auth/viewer-context";
import {
    getCombinedAnalytics,
    getTrendData,
    getActivityProgressByRisk,
} from "./queries";
import {
    transformRiskLevelCounts,
    transformTrendData,
    transformGradeRiskData,
    transformActivityProgress,
    transformHospitalReferrals,
} from "./transforms";
import {
    ANALYTICS_OVERVIEW_TAG,
    getAnalyticsCacheTags,
} from "./cache";

import type { AnalyticsData, SystemAnalyticsOverview } from "./types";
import { logError } from "@/lib/utils/logging";

function buildAnalyticsCacheKey(input: {
    role: string;
    schoolId?: string;
    targetClass: string;
    academicYearStr: string;
    semesterStr: string;
}): string[] {
    return [
        "analytics-data",
        `role:${input.role}`,
        `school:${input.schoolId ?? "none"}`,
        `class:${input.targetClass || "all"}`,
        `year:${input.academicYearStr || "all"}`,
        `semester:${input.semesterStr || "all"}`,
    ];
}

async function fetchAnalyticsData(
    schoolId: string | undefined,
    targetClass: string,
    role: string,
    academicYearStr: string,
    semesterStr: string,
): Promise<AnalyticsData> {
    const classFilter = targetClass || undefined;
    let academicYear = academicYearStr ? parseInt(academicYearStr, 10) : undefined;
    const semester = semesterStr ? parseInt(semesterStr, 10) : undefined;

    if (!schoolId && !academicYear && !semester) {
        const latestYear = await prisma.academicYear.findFirst({
            orderBy: { year: "desc" },
            select: { year: true },
        });
        if (latestYear) {
            academicYear = latestYear.year;
        }
    }

    const studentWhere: { schoolId?: string; class?: string } = {
        ...(schoolId ? { schoolId } : {}),
    };
    if (classFilter) {
        studentWhere.class = classFilter;
    }

    const showClassFilter = role === "school_admin" || role === "system_admin";

    const [
        totalStudents,
        availableClasses,
        availableAcademicTermsRaw,
        combinedData,
        trendDataRaw,
        activityProgressRaw,
    ] = await Promise.all([
        prisma.student.count({ where: studentWhere }),
        showClassFilter
            ? prisma.student
                  .findMany({
                      where: { ...(schoolId ? { schoolId } : {}) },
                      select: { class: true },
                      distinct: ["class"],
                      orderBy: { class: "asc" },
                  })
                  .then((classes) => classes.map((c) => c.class))
            : Promise.resolve([]),
        prisma.academicYear.findMany({
            where: {
                phqResults: {
                    some: {
                        student: {
                            ...(schoolId ? { schoolId } : {}),
                            ...(classFilter ? { class: classFilter } : {}),
                        },
                    },
                },
            },
            select: {
                year: true,
                semester: true,
            },
            distinct: ["year", "semester"],
            orderBy: [{ year: "desc" }, { semester: "asc" }],
        }),
        getCombinedAnalytics(schoolId, classFilter, academicYear, semester),
        getTrendData(schoolId, classFilter, academicYear, semester),
        getActivityProgressByRisk(schoolId, classFilter, academicYear, semester),
    ]);

    const availableAcademicYears = Array.from(
        new Set(availableAcademicTermsRaw.map((term) => term.year)),
    );
    const availableSemesters = Array.from(
        new Set(availableAcademicTermsRaw.map((term) => term.semester)),
    ).sort((a, b) => a - b);

    const {
        riskLevelCounts: riskLevelCountsRaw,
        gradeRiskData: gradeRiskDataRaw,
        hospitalReferrals: hospitalReferralsRaw,
    } = combinedData;

    const studentsWithAssessment = riskLevelCountsRaw.reduce(
        (sum, r) => sum + Number(r.count),
        0,
    );
    const studentsWithoutAssessment = Math.max(
        0,
        totalStudents - studentsWithAssessment,
    );
    const totalReferrals = riskLevelCountsRaw.reduce(
        (sum, r) => sum + Number(r.referral_count),
        0,
    );

    const riskLevelSummary = transformRiskLevelCounts(
        riskLevelCountsRaw,
        studentsWithAssessment,
    );
    const trendData = transformTrendData(trendDataRaw);
    const gradeRiskData = transformGradeRiskData(gradeRiskDataRaw);
    const activityProgressByRisk = transformActivityProgress(activityProgressRaw);
    const hospitalReferralsByGrade =
        transformHospitalReferrals(hospitalReferralsRaw);

    return {
        totalStudents,
        riskLevelSummary,
        studentsWithAssessment,
        studentsWithoutAssessment,
        availableClasses,
        availableAcademicYears,
        availableSemesters,
        currentClass: classFilter,
        currentAcademicYear: academicYear,
        currentSemester: semester,
        trendData,
        activityProgressByRisk,
        gradeRiskData,
        hospitalReferralsByGrade,
        totalReferrals,
    };
}

async function getCachedAnalyticsData(
    schoolId: string | undefined,
    targetClass: string,
    role: string,
    academicYearStr: string,
    semesterStr: string,
): Promise<AnalyticsData> {
    const cacheKey = buildAnalyticsCacheKey({
        role,
        schoolId,
        targetClass,
        academicYearStr,
        semesterStr,
    });

    const cachedFetcher = unstable_cache(
        async () =>
            fetchAnalyticsData(
                schoolId,
                targetClass,
                role,
                academicYearStr,
                semesterStr,
            ),
        cacheKey,
        { revalidate: 300, tags: getAnalyticsCacheTags(schoolId) },
    );

    return cachedFetcher();
}

export async function getAnalyticsSummary(
    classFilter?: string,
    schoolFilter?: string,
    academicYear?: number,
    semester?: number,
): Promise<AnalyticsData | null> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && viewer.role !== "system_admin") {
            return null;
        }

        if (viewer.role === "system_admin" && !schoolFilter) {
            return null;
        }

        let targetClass: string | undefined;
        if (viewer.role === "class_teacher") {
            targetClass = viewer.advisoryClass;
            if (!targetClass) {
                return null;
            }
        } else {
            targetClass = classFilter;
        }

        const schoolId =
            viewer.role === "system_admin"
                ? schoolFilter
                : viewer.schoolId;

        return getCachedAnalyticsData(
            schoolId,
            targetClass ?? "",
            viewer.role,
            academicYear?.toString() ?? "",
            semester?.toString() ?? "",
        );
    } catch (error) {
        logError("Get analytics summary error:", error);
        return null;
    }
}

async function fetchSystemAnalyticsOverview(): Promise<SystemAnalyticsOverview> {
    const [totalSchools, totalStudents, currentAcademicYear] = await Promise.all([
        prisma.school.count(),
        prisma.student.count(),
        prisma.academicYear.findFirst({
            where: { isCurrent: true },
            orderBy: [{ year: "desc" }, { semester: "desc" }],
            select: { id: true, year: true, semester: true },
        }),
    ]);

    const resolvedAcademicYear =
        currentAcademicYear ??
        (await prisma.academicYear.findFirst({
            orderBy: [{ year: "desc" }, { semester: "desc" }],
            select: { id: true, year: true, semester: true },
        }));

    if (!resolvedAcademicYear) {
        return {
            totalSchools,
            totalStudents,
            studentsWithAssessment: 0,
            screeningCoveragePercent: 0,
            academicYearLabel: "ยังไม่มีข้อมูลปีการศึกษา",
        };
    }

    const assessedStudentsRaw = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT pr."studentId")::bigint as count
        FROM phq_results pr
        WHERE pr."academicYearId" = ${resolvedAcademicYear.id}
    `;
    const studentsWithAssessment = Number(
        assessedStudentsRaw[0]?.count ?? BigInt(0),
    );
    const screeningCoveragePercent =
        totalStudents > 0
            ? Math.round((studentsWithAssessment / totalStudents) * 100)
            : 0;

    return {
        totalSchools,
        totalStudents,
        studentsWithAssessment,
        screeningCoveragePercent,
        academicYearLabel: `ปีการศึกษา ${resolvedAcademicYear.year} เทอม ${resolvedAcademicYear.semester}`,
    };
}

export async function getSystemAnalyticsOverview(): Promise<SystemAnalyticsOverview | null> {
    try {
        const viewer = await getViewerContext();
        if (viewer.role !== "system_admin") {
            return null;
        }

        const cachedOverviewFetcher = unstable_cache(
            async () => fetchSystemAnalyticsOverview(),
            ["analytics-system-overview"],
            { revalidate: 300, tags: [ANALYTICS_OVERVIEW_TAG] },
        );

        return cachedOverviewFetcher();
    } catch (error) {
        logError("Get system analytics overview error:", error);
        return null;
    }
}
