import type {
    RiskLevelSummary,
    TrendDataPoint,
    GradeRiskData,
    ActivityProgressByRisk,
    HospitalReferralByGrade,
} from "./types";
import { RISK_LEVEL_CONFIG } from "./constants";

/**
 * Transform functions for converting raw query results to API interfaces
 */

/**
 * Transform risk level counts to RiskLevelSummary
 */
export function transformRiskLevelCounts(
    rawResults: Array<{
        risk_level: string;
        count: bigint;
        referral_count: bigint;
    }>,
    totalStudentsWithAssessment: number,
): RiskLevelSummary[] {
    const countMap = new Map(
        rawResults.map((r) => [
            r.risk_level,
            {
                count: Number(r.count),
                referralCount: Number(r.referral_count),
            },
        ]),
    );

    // Ensure all risk levels are present (even if count is 0)
    return Object.entries(RISK_LEVEL_CONFIG).map(([level, config]) => {
        const data = countMap.get(level) || { count: 0, referralCount: 0 };
        return {
            riskLevel: level,
            count: data.count,
            label: config.label,
            color: config.color,
            percentage:
                totalStudentsWithAssessment > 0
                    ? (data.count / totalStudentsWithAssessment) * 100
                    : 0,
            referralCount: data.referralCount,
        };
    });
}

/**
 * Transform trend data to TrendDataPoint
 */
export function transformTrendData(
    rawResults: Array<{
        academic_year: number;
        semester: number;
        assessment_round: number;
        risk_level: string;
        count: bigint;
    }>,
): TrendDataPoint[] {
    // Group by period
    const periodMap = new Map<
        string,
        {
            academicYear: number;
            semester: number;
            round: number;
            counts: Record<string, number>;
        }
    >();

    rawResults.forEach((result) => {
        const key = `${result.academic_year}-${result.semester}-${result.assessment_round}`;
        if (!periodMap.has(key)) {
            periodMap.set(key, {
                academicYear: result.academic_year,
                semester: result.semester,
                round: result.assessment_round,
                counts: {
                    blue: 0,
                    green: 0,
                    yellow: 0,
                    orange: 0,
                    red: 0,
                },
            });
        }

        const periodData = periodMap.get(key);
        if (periodData && result.risk_level in periodData.counts) {
            periodData.counts[
                result.risk_level as keyof typeof periodData.counts
            ] = Number(result.count);
        }
    });

    // Convert to array and format
    return Array.from(periodMap.values()).map((entry) => {
        const roundLabel = entry.round === 1 ? "ต้นเทอม" : "ปลายเทอม";
        return {
            period: `${roundLabel}/${entry.semester}`,
            academicYear: entry.academicYear,
            semester: entry.semester,
            round: entry.round,
            blue: entry.counts.blue,
            green: entry.counts.green,
            yellow: entry.counts.yellow,
            orange: entry.counts.orange,
            red: entry.counts.red,
        };
    });
}

/**
 * Transform grade risk data to GradeRiskData
 */
export function transformGradeRiskData(
    rawResults: Array<{
        grade: string;
        risk_level: string;
        count: bigint;
    }>,
): GradeRiskData[] {
    const gradeMap = new Map<
        string,
        {
            red: number;
            orange: number;
            yellow: number;
            green: number;
            blue: number;
        }
    >();

    rawResults.forEach((result) => {
        if (!gradeMap.has(result.grade)) {
            gradeMap.set(result.grade, {
                red: 0,
                orange: 0,
                yellow: 0,
                green: 0,
                blue: 0,
            });
        }

        const gradeData = gradeMap.get(result.grade);
        if (gradeData && result.risk_level in gradeData) {
            gradeData[result.risk_level as keyof typeof gradeData] = Number(
                result.count,
            );
        }
    });

    return Array.from(gradeMap.entries())
        .map(([grade, counts]) => ({
            grade,
            red: counts.red,
            orange: counts.orange,
            yellow: counts.yellow,
            green: counts.green,
            blue: counts.blue,
            total:
                counts.red +
                counts.orange +
                counts.yellow +
                counts.green +
                counts.blue,
        }))
        .sort((a, b) => {
            // Natural sort for Thai grade levels (ม.1, ม.2, ..., ม.6)
            const gradeA = parseInt(a.grade.match(/\d+/)?.[0] || "0");
            const gradeB = parseInt(b.grade.match(/\d+/)?.[0] || "0");
            return gradeA - gradeB;
        });
}

/**
 * Transform activity progress data to ActivityProgressByRisk
 */
export function transformActivityProgress(
    rawResults: Array<{
        risk_level: string;
        total_students: bigint;
        activity1: bigint;
        activity2: bigint;
        activity3: bigint;
        activity4: bigint;
        activity5: bigint;
    }>,
): ActivityProgressByRisk[] {
    const resultMap = new Map(rawResults.map((r) => [r.risk_level, r]));

    // Ensure all risk levels are present
    return Object.entries(RISK_LEVEL_CONFIG).map(([level, config]) => {
        const data = resultMap.get(level);
        if (!data) {
            return {
                riskLevel: level,
                label: config.label,
                color: config.color,
                totalStudents: 0,
                noActivity: 0,
                activity1: 0,
                activity2: 0,
                activity3: 0,
                activity4: 0,
                activity5: 0,
            };
        }

        const totalStudents = Number(data.total_students);
        const activity1 = Number(data.activity1);
        const activity2 = Number(data.activity2);
        const activity3 = Number(data.activity3);
        const activity4 = Number(data.activity4);
        const activity5 = Number(data.activity5);

        // Note: The query should handle counting distinct students with activities
        // For now, approximate by taking the max activity count
        const maxActivityCount = Math.max(
            activity1,
            activity2,
            activity3,
            activity4,
            activity5,
        );

        return {
            riskLevel: level,
            label: config.label,
            color: config.color,
            totalStudents,
            noActivity: Math.max(0, totalStudents - maxActivityCount),
            activity1,
            activity2,
            activity3,
            activity4,
            activity5,
        };
    });
}

/**
 * Transform hospital referral data to HospitalReferralByGrade
 */
export function transformHospitalReferrals(
    rawResults: Array<{
        grade: string;
        referral_count: bigint;
    }>,
): HospitalReferralByGrade[] {
    return rawResults
        .map((result) => ({
            grade: result.grade,
            referralCount: Number(result.referral_count),
        }))
        .sort((a, b) => {
            // Natural sort for Thai grade levels (ม.1, ม.2, ..., ม.6)
            const gradeA = parseInt(a.grade.match(/\d+/)?.[0] || "0");
            const gradeB = parseInt(b.grade.match(/\d+/)?.[0] || "0");
            return gradeA - gradeB;
        });
}
