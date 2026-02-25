"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { unstable_cache } from "next/cache";
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

/**
 * Cached analytics data fetcher
 * Caches expensive DB queries (CTE + ROW_NUMBER) for 5 minutes
 * Invalidated via revalidateTag("analytics") when data changes
 */
const getCachedAnalyticsData = unstable_cache(
    async (
        schoolId: string | undefined,
        targetClass: string,
        role: string,
        academicYearStr: string,
    ): Promise<AnalyticsData> => {
        const classFilter = targetClass || undefined;
        const academicYear = academicYearStr
            ? parseInt(academicYearStr, 10)
            : undefined;

        // Build student query based on role and filter
        const studentWhere: { schoolId?: string; class?: string } = {
            ...(schoolId ? { schoolId } : {}),
        };
        if (classFilter) {
            studentWhere.class = classFilter;
        }

        // school_admin and system_admin can see class filter dropdown
        const showClassFilter =
            role === "school_admin" || role === "system_admin";

        // When filtering by academic year, count only students with PHQ results in that year
        // Otherwise totalStudents - studentsWithAssessment would be incorrect
        const studentCountWhere = academicYear
            ? {
                  ...studentWhere,
                  phqResults: {
                      some: { academicYear: { year: academicYear } },
                  },
              }
            : studentWhere;

        // Get total students + available classes + available years in parallel with analytics
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
            // Fetch distinct academic years that have PHQ results (scoped to school + class)
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

/**
 * Get analytics summary for current teacher's students
 * Uses cached data (5 min TTL) to avoid repeated heavy queries
 * @param classFilter - Optional class filter for school_admin (e.g. "ม.1/1")
 * @param schoolFilter - Optional school filter for system_admin
 * @param academicYear - Optional academic year number filter (e.g. 2568)
 */
export async function getAnalyticsSummary(
    classFilter?: string,
    schoolFilter?: string,
    academicYear?: number,
): Promise<AnalyticsData | null> {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                schoolId: true,
                role: true,
                teacher: {
                    select: {
                        advisoryClass: true,
                    },
                },
            },
        });

        // system_admin doesn't need schoolId
        const isSystemAdminRole = user?.role === "system_admin";
        if (!user?.schoolId && !isSystemAdminRole) {
            return null;
        }

        let targetClass: string | undefined;
        if (user.role === "class_teacher") {
            targetClass = user.teacher?.advisoryClass;
            if (!targetClass) {
                return null;
            }
        } else if (user.role === "school_admin" || isSystemAdminRole) {
            targetClass = classFilter;
        }

        // system_admin: use schoolFilter if provided, otherwise undefined (all schools)
        const schoolId = isSystemAdminRole
            ? schoolFilter || undefined
            : (user.schoolId ?? undefined);

        return getCachedAnalyticsData(
            schoolId,
            targetClass ?? "",
            user.role,
            academicYear?.toString() ?? "",
        );
    } catch (error) {
        console.error("Get analytics summary error:", error);
        return null;
    }
}

/**
 * Get risk level configuration
 */
export async function getRiskLevelConfig() {
    return RISK_LEVEL_CONFIG;
}
