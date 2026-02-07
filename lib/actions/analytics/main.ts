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
        schoolId: string,
        targetClass: string,
        role: string,
    ): Promise<AnalyticsData> => {
        const classFilter = targetClass || undefined;

        // Build student query based on role and filter
        const studentWhere: { schoolId: string; class?: string } = {
            schoolId,
        };
        if (classFilter) {
            studentWhere.class = classFilter;
        }

        // Get total students + available classes in parallel with analytics
        const [totalStudents, availableClasses, combinedData, trendDataRaw, activityProgressRaw] =
            await Promise.all([
                prisma.student.count({ where: studentWhere }),
                role === "school_admin"
                    ? prisma.student
                          .findMany({
                              where: { schoolId },
                              select: { class: true },
                              distinct: ["class"],
                              orderBy: { class: "asc" },
                          })
                          .then((classes) => classes.map((c) => c.class))
                    : Promise.resolve([]),
                getCombinedAnalytics(schoolId, classFilter),
                getTrendData(schoolId, classFilter),
                getActivityProgressByRisk(schoolId, classFilter),
            ]);

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
            currentClass: classFilter,
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
 */
export async function getAnalyticsSummary(
    classFilter?: string,
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

        if (!user?.schoolId) {
            return null;
        }

        let targetClass: string | undefined;
        if (user.role === "class_teacher") {
            targetClass = user.teacher?.advisoryClass;
            if (!targetClass) {
                return null;
            }
        } else if (user.role === "school_admin") {
            targetClass = classFilter;
        }

        return getCachedAnalyticsData(
            user.schoolId,
            targetClass ?? "",
            user.role,
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
