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
import { RISK_LEVEL_CONFIG } from "./constants";

import type { AnalyticsData } from "./types";
import { logError } from "@/lib/utils/logging";

const getCachedAnalyticsData = unstable_cache(
    async (
        schoolId: string | undefined,
        targetClass: string,
        role: string,
        academicYearStr: string,
    ): Promise<AnalyticsData> => {
        const classFilter = targetClass || undefined;
        let academicYear = academicYearStr
            ? parseInt(academicYearStr, 10)
            : undefined;

        if (!schoolId && !academicYear) {
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

        const showClassFilter =
            role === "school_admin" || role === "system_admin";

        const studentCountWhere = academicYear
            ? {
                  ...studentWhere,
                  phqResults: {
                      some: { academicYear: { year: academicYear } },
                  },
              }
            : studentWhere;

        const [
            totalStudents,
            availableClasses,
            availableYearsRaw,
            combinedData,
            trendDataRaw,
            activityProgressRaw,
        ] = await Promise.all([
            prisma.student.count({ where: studentCountWhere }),
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
                                ...(classFilter
                                    ? { class: classFilter }
                                    : {}),
                            },
                        },
                    },
                },
                select: { year: true },
                distinct: ["year"],
                orderBy: { year: "desc" },
            }),
            getCombinedAnalytics(schoolId, classFilter, academicYear),
            getTrendData(schoolId, classFilter, academicYear),
            getActivityProgressByRisk(schoolId, classFilter, academicYear),
        ]);

        const availableAcademicYears = availableYearsRaw.map((y) => y.year);

        const {
            riskLevelCounts: riskLevelCountsRaw,
            gradeRiskData: gradeRiskDataRaw,
            hospitalReferrals: hospitalReferralsRaw,
        } = combinedData;

        const studentsWithAssessment = riskLevelCountsRaw.reduce(
            (sum, r) => sum + Number(r.count),
            0,
        );
        const studentsWithoutAssessment =
            totalStudents - studentsWithAssessment;
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
        const activityProgressByRisk =
            transformActivityProgress(activityProgressRaw);
        const hospitalReferralsByGrade =
            transformHospitalReferrals(hospitalReferralsRaw);

        return {
            totalStudents,
            riskLevelSummary,
            studentsWithAssessment,
            studentsWithoutAssessment,
            availableClasses,
            availableAcademicYears,
            currentClass: classFilter,
            currentAcademicYear: academicYear,
            trendData,
            activityProgressByRisk,
            gradeRiskData,
            hospitalReferralsByGrade,
            totalReferrals,
        };
    },
    ["analytics-data"],
    { revalidate: 300, tags: ["analytics"] },
);

export async function getAnalyticsSummary(
    classFilter?: string,
    schoolFilter?: string,
    academicYear?: number,
): Promise<AnalyticsData | null> {
    try {
        const viewer = await getViewerContext();

        if (!viewer.schoolId && viewer.role !== "system_admin") {
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
                ? schoolFilter || undefined
                : viewer.schoolId;

        return getCachedAnalyticsData(
            schoolId,
            targetClass ?? "",
            viewer.role,
            academicYear?.toString() ?? "",
        );
    } catch (error) {
        logError("Get analytics summary error:", error);
        return null;
    }
}

export async function getRiskLevelConfig() {
    return RISK_LEVEL_CONFIG;
}
