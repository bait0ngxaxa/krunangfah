/**
 * PHQ-A Scoring Utility
 * คำนวณระดับความเสี่ยงจากคะแนน PHQ-A
 */

import { getRiskLevelConfig } from "@/lib/constants/risk-levels";

export type RiskLevel = "blue" | "green" | "yellow" | "orange" | "red";

export interface PhqScores {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    q5: number;
    q6: number;
    q7: number;
    q8: number;
    q9: number;
    q9a: boolean;
    q9b: boolean;
}

export interface ScoringResult {
    totalScore: number;
    riskLevel: RiskLevel;
    riskLabel: string;
    riskColor: string;
}

export function getRiskBgClass(level: RiskLevel): string {
    return getRiskLevelConfig(level).bgSolid;
}

export function getRiskLabel(level: RiskLevel): string {
    return getRiskLevelConfig(level).label;
}

function getRiskData(level: RiskLevel): {
    riskLabel: string;
    riskColor: string;
} {
    const config = getRiskLevelConfig(level);
    return { riskLabel: config.label, riskColor: config.hexColor };
}

/**
 * Calculate risk level from PHQ-A scores
 *
 * Scoring rules:
 * - 0-4 = blue (ปกติ)
 * - 5-9 = green (เฝ้าระวังเล็กน้อย)
 * - 10-14 = yellow (เฝ้าระวังปานกลาง)
 * - 15-19 = orange (มีความเสี่ยง)
 * - 20-27 OR q9a = true = red (ความเสี่ยงสูง)
 */
export function calculateRiskLevel(scores: PhqScores): ScoringResult {
    const totalScore =
        scores.q1 +
        scores.q2 +
        scores.q3 +
        scores.q4 +
        scores.q5 +
        scores.q6 +
        scores.q7 +
        scores.q8 +
        scores.q9;

    let riskLevel: RiskLevel;

    // Special case: q9a = true → red immediately (q9b is informational only)
    if (scores.q9a) {
        riskLevel = "red";
    } else if (totalScore >= 20) {
        riskLevel = "red";
    } else if (totalScore >= 15) {
        riskLevel = "orange";
    } else if (totalScore >= 10) {
        riskLevel = "yellow";
    } else if (totalScore >= 5) {
        riskLevel = "green";
    } else {
        riskLevel = "blue";
    }

    const { riskLabel, riskColor } = getRiskData(riskLevel);
    return { totalScore, riskLevel, riskLabel, riskColor };
}

/**
 * Calculate total score only
 */
export function calculateTotalScore(scores: PhqScores): number {
    return (
        scores.q1 +
        scores.q2 +
        scores.q3 +
        scores.q4 +
        scores.q5 +
        scores.q6 +
        scores.q7 +
        scores.q8 +
        scores.q9
    );
}
