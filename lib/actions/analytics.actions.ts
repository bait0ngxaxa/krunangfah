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

export interface TrendDataPoint {
    period: string; // "ต้นเทอม/1", "ปลายเทอม/1", etc.
    academicYear: number; // ปีการศึกษา
    semester: number; // 1 or 2
    round: number; // 1 or 2
    blue: number;
    green: number;
    yellow: number;
    orange: number;
    red: number;
}

export interface ActivityProgressByRisk {
    riskLevel: string;
    label: string;
    color: string;
    totalStudents: number;
    noActivity: number; // ยังไม่ทำกิจกรรม
    activity1: number; // กิจกรรม 1
    activity2: number; // กิจกรรม 2
    activity3: number; // กิจกรรม 3
    activity4: number; // กิจกรรม 4
    activity5: number; // กิจกรรม 5
}

export interface AnalyticsData {
    totalStudents: number;
    riskLevelSummary: RiskLevelSummary[];
    studentsWithAssessment: number;
    studentsWithoutAssessment: number;
    availableClasses: string[];
    currentClass?: string;
    trendData: TrendDataPoint[];
    activityProgressByRisk: ActivityProgressByRisk[];
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

        // Get latest PHQ results for each student
        const phqResults = await prisma.phqResult.findMany({
            where: {
                student: studentWhere,
            },
            include: {
                student: true,
                academicYear: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Get unique students with latest assessment
        const studentLatestAssessment = new Map<
            string,
            (typeof phqResults)[0]
        >();
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
        const studentsWithoutAssessment =
            totalStudents - studentsWithAssessment;

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

        // Create trend data grouped by academic year, semester, and round
        // Track unique students per period to avoid duplicates
        const trendMap = new Map<
            string,
            {
                academicYear: number;
                semester: number;
                round: number;
                studentResults: Map<string, string>; // studentId -> riskLevel
            }
        >();

        phqResults.forEach((result) => {
            const key = `${result.academicYearId}-${result.assessmentRound}`;
            if (!trendMap.has(key)) {
                trendMap.set(key, {
                    academicYear: result.academicYear.year,
                    semester: result.academicYear.semester,
                    round: result.assessmentRound,
                    studentResults: new Map(),
                });
            }

            const entry = trendMap.get(key);
            if (entry) {
                // Keep only latest result per student (phqResults is already sorted by createdAt desc)
                if (!entry.studentResults.has(result.studentId)) {
                    entry.studentResults.set(
                        result.studentId,
                        result.riskLevel,
                    );
                }
            }
        });

        // Convert to array and sort by year, semester, round
        const trendData: TrendDataPoint[] = Array.from(trendMap.values())
            .sort((a, b) => {
                if (a.academicYear !== b.academicYear) {
                    return a.academicYear - b.academicYear;
                }
                if (a.semester !== b.semester) {
                    return a.semester - b.semester;
                }
                return a.round - b.round;
            })
            .map((entry) => {
                const roundLabel = entry.round === 1 ? "ต้นเทอม" : "ปลายเทอม";

                // Count risk levels from unique students
                const counts = {
                    blue: 0,
                    green: 0,
                    yellow: 0,
                    orange: 0,
                    red: 0,
                };
                entry.studentResults.forEach((riskLevel) => {
                    if (riskLevel in counts) {
                        counts[riskLevel as keyof typeof counts]++;
                    }
                });

                return {
                    period: `${roundLabel}/${entry.semester}`,
                    academicYear: entry.academicYear,
                    semester: entry.semester,
                    round: entry.round,
                    blue: counts.blue,
                    green: counts.green,
                    yellow: counts.yellow,
                    orange: counts.orange,
                    red: counts.red,
                };
            });

        // Get activity progress for students with latest assessment
        const studentIdsWithAssessment = Array.from(
            studentLatestAssessment.keys(),
        );

        const activityProgress = await prisma.activityProgress.findMany({
            where: {
                studentId: { in: studentIdsWithAssessment },
            },
            select: {
                studentId: true,
                phqResultId: true,
                activityNumber: true,
                status: true,
            },
        });

        // Create activity progress summary by risk level
        const activityProgressByRisk: ActivityProgressByRisk[] = Object.entries(
            riskLevelCounts,
        ).map(([level, totalCount]) => {
            const config =
                RISK_LEVEL_CONFIG[level as keyof typeof RISK_LEVEL_CONFIG];

            // Count activity progress for students in this level
            const activityCounts = {
                activity1: 0,
                activity2: 0,
                activity3: 0,
                activity4: 0,
                activity5: 0,
            };

            // Track which students have started activities
            const studentsWithActivity = new Set<string>();

            activityProgress.forEach((progress) => {
                // Get the student's latest assessment
                const latestAssessment = studentLatestAssessment.get(
                    progress.studentId,
                );

                // Only count if this progress is for the latest assessment AND matches this risk level AND completed
                if (
                    latestAssessment &&
                    latestAssessment.id === progress.phqResultId &&
                    latestAssessment.riskLevel === level &&
                    progress.status === "completed"
                ) {
                    studentsWithActivity.add(progress.studentId);

                    if (
                        progress.activityNumber >= 1 &&
                        progress.activityNumber <= 5
                    ) {
                        const key =
                            `activity${progress.activityNumber}` as keyof typeof activityCounts;
                        activityCounts[key]++;
                    }
                }
            });

            const noActivity = totalCount - studentsWithActivity.size;

            return {
                riskLevel: level,
                label: config.label,
                color: config.color,
                totalStudents: totalCount,
                noActivity,
                activity1: activityCounts.activity1,
                activity2: activityCounts.activity2,
                activity3: activityCounts.activity3,
                activity4: activityCounts.activity4,
                activity5: activityCounts.activity5,
            };
        });

        return {
            totalStudents,
            riskLevelSummary,
            studentsWithAssessment,
            studentsWithoutAssessment,
            availableClasses,
            currentClass: targetClass,
            trendData,
            activityProgressByRisk,
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
