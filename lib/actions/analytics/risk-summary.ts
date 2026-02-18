import { RISK_LEVEL_CONFIG } from "./constants";
import type { RiskLevelSummary } from "./types";

/**
 * Calculate risk level summary from PHQ results
 */
export async function calculateRiskLevelSummary(
    studentLatestAssessment: Map<
        string,
        { riskLevel: string; referredToHospital: boolean }
    >,
): Promise<RiskLevelSummary[]> {
    const studentsWithAssessment = studentLatestAssessment.size;

    // Count by risk level
    const riskLevelCounts = {
        blue: 0,
        green: 0,
        yellow: 0,
        orange: 0,
        red: 0,
    };

    studentLatestAssessment.forEach((result) => {
        switch (result.riskLevel) {
            case "blue":   riskLevelCounts.blue++;   break;
            case "green":  riskLevelCounts.green++;  break;
            case "yellow": riskLevelCounts.yellow++; break;
            case "orange": riskLevelCounts.orange++; break;
            case "red":    riskLevelCounts.red++;    break;
        }
    });

    // Count referrals by risk level
    const referralCountsByLevel = {
        blue: 0,
        green: 0,
        yellow: 0,
        orange: 0,
        red: 0,
    };

    studentLatestAssessment.forEach((result) => {
        if (result.referredToHospital) {
            switch (result.riskLevel) {
                case "blue":   referralCountsByLevel.blue++;   break;
                case "green":  referralCountsByLevel.green++;  break;
                case "yellow": referralCountsByLevel.yellow++; break;
                case "orange": referralCountsByLevel.orange++; break;
                case "red":    referralCountsByLevel.red++;    break;
            }
        }
    });

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
            referralCount:
                referralCountsByLevel[
                    level as keyof typeof referralCountsByLevel
                ],
        };
    });

    return riskLevelSummary;
}
