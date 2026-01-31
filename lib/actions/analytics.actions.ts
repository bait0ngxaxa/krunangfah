"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export interface RiskLevelSummary {
    riskLevel: string;
    count: number;
    label: string;
    color: string;
    percentage: number;
}

export interface AnalyticsData {
    totalStudents: number;
    riskLevelSummary: RiskLevelSummary[];
    studentsWithAssessment: number;
    studentsWithoutAssessment: number;
}

const RISK_LEVEL_CONFIG = {
    blue: {
        label: "สีฟ้า (ปกติ)",
        color: "#3B82F6",
        referToNurse: false,
    },
    green: {
        label: "สีเขียว (เสี่ยงเล็กน้อย)",
        color: "#10B981",
        referToNurse: false,
    },
    yellow: {
        label: "สีเหลือง (มีปัญหา)",
        color: "#FCD34D",
        referToNurse: true,
    },
    orange: {
        label: "สีส้ม (เสี่ยงรุนแรง)",
        color: "#F97316",
        referToNurse: true,
    },
    red: {
        label: "สีแดง (รุนแรง)",
        color: "#EF4444",
        referToNurse: true,
    },
} as const;

/**
 * Get analytics summary for current teacher's students
 */
export async function getAnalyticsSummary(): Promise<AnalyticsData | null> {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        // Get user's schoolId
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { schoolId: true },
        });

        if (!user?.schoolId) {
            return null;
        }

        // Get total students in the school
        const totalStudents = await prisma.student.count({
            where: { schoolId: user.schoolId },
        });

        // Get latest PHQ results for each student
        const phqResults = await prisma.phqResult.findMany({
            where: {
                student: {
                    schoolId: user.schoolId,
                },
            },
            include: {
                student: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Get unique students with latest assessment
        const studentLatestAssessment = new Map<string, typeof phqResults[0]>();
        phqResults.forEach((result) => {
            if (!studentLatestAssessment.has(result.studentId)) {
                studentLatestAssessment.set(result.studentId, result);
            }
        });

        // Count by risk level
        const riskLevelCounts = {
            blue: 0,
            green: 0,
            yellow: 0,
            orange: 0,
            red: 0,
        };

        studentLatestAssessment.forEach((result) => {
            const level = result.riskLevel as keyof typeof riskLevelCounts;
            if (level in riskLevelCounts) {
                riskLevelCounts[level]++;
            }
        });

        const studentsWithAssessment = studentLatestAssessment.size;
        const studentsWithoutAssessment = totalStudents - studentsWithAssessment;

        // Calculate percentages and create summary
        const riskLevelSummary: RiskLevelSummary[] = Object.entries(
            riskLevelCounts,
        ).map(([level, count]) => {
            const config =
                RISK_LEVEL_CONFIG[level as keyof typeof RISK_LEVEL_CONFIG];
            return {
                riskLevel: level,
                count,
                label: config.label,
                color: config.color,
                percentage:
                    studentsWithAssessment > 0
                        ? (count / studentsWithAssessment) * 100
                        : 0,
            };
        });

        return {
            totalStudents,
            riskLevelSummary,
            studentsWithAssessment,
            studentsWithoutAssessment,
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
