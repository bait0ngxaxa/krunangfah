"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
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
 * Get analytics summary for current teacher's students
 * @param classFilter - Optional class filter for school_admin (e.g. "ม.1/1")
 */
export async function getAnalyticsSummary(
    classFilter?: string,
): Promise<AnalyticsData | null> {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        // Get user with teacher profile
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

        // Determine which classes to show based on role
        let targetClass: string | undefined;
        if (user.role === "class_teacher") {
            // Class teacher: only show their advisory class
            targetClass = user.teacher?.advisoryClass;
            if (!targetClass) {
                return null;
            }
        } else if (user.role === "school_admin") {
            // School admin: show filtered class or all classes
            targetClass = classFilter;
        }

        // Build student query based on role and filter
        const studentWhere: {
            schoolId: string;
            class?: string;
        } = {
            schoolId: user.schoolId,
        };

        if (targetClass) {
            studentWhere.class = targetClass;
        }

        // Get total students
        const totalStudents = await prisma.student.count({
            where: studentWhere,
        });

        // Get all available classes for school_admin
        let availableClasses: string[] = [];
        if (user.role === "school_admin") {
            const classes = await prisma.student.findMany({
                where: { schoolId: user.schoolId },
                select: { class: true },
                distinct: ["class"],
                orderBy: { class: "asc" },
            });
            availableClasses = classes.map((c) => c.class);
        }

        // ✅ Optimized: Single combined query for risk/grade/hospital data
        const [combinedData, trendDataRaw, activityProgressRaw] =
            await Promise.all([
                getCombinedAnalytics(user.schoolId, targetClass),
                getTrendData(user.schoolId, targetClass),
                getActivityProgressByRisk(user.schoolId, targetClass),
            ]);

        const { riskLevelCounts: riskLevelCountsRaw, gradeRiskData: gradeRiskDataRaw, hospitalReferrals: hospitalReferralsRaw } = combinedData;

        // Calculate total students with assessment from risk level counts
        const studentsWithAssessment = riskLevelCountsRaw.reduce(
            (sum, r) => sum + Number(r.count),
            0,
        );
        const studentsWithoutAssessment =
            totalStudents - studentsWithAssessment;

        // Calculate total referrals from risk level counts
        const totalReferrals = riskLevelCountsRaw.reduce(
            (sum, r) => sum + Number(r.referral_count),
            0,
        );

        // Transform raw results to API interfaces
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
            currentClass: targetClass,
            trendData,
            activityProgressByRisk,
            gradeRiskData,
            hospitalReferralsByGrade,
            totalReferrals,
        };
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
