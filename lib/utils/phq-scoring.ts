/**
 * PHQ-A Scoring Utility
 * คำนวณระดับความเสี่ยงจากคะแนน PHQ-A
 */

import {
    getRiskLevelConfig,
    type RiskLevel,
} from "@/lib/constants/risk-levels";
import {
    isPhqScore,
    type PhqScore,
} from "@/lib/constants/phq-score-labels";

export type { RiskLevel };

export interface PhqScores {
    q1: PhqScore;
    q2: PhqScore;
    q3: PhqScore;
    q4: PhqScore;
    q5: PhqScore;
    q6: PhqScore;
    q7: PhqScore;
    q8: PhqScore;
    q9: PhqScore;
    q9a: boolean;
    q9b: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function isPhqScores(value: unknown): value is PhqScores {
    return (
        isRecord(value) &&
        isPhqScore(value.q1) &&
        isPhqScore(value.q2) &&
        isPhqScore(value.q3) &&
        isPhqScore(value.q4) &&
        isPhqScore(value.q5) &&
        isPhqScore(value.q6) &&
        isPhqScore(value.q7) &&
        isPhqScore(value.q8) &&
        isPhqScore(value.q9) &&
        typeof value.q9a === "boolean" &&
        typeof value.q9b === "boolean"
    );
}

export interface ScoringResult {
    totalScore: number;
    riskLevel: RiskLevel;
    riskLabel: string;
    riskColor: string;
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
 * - 20-27 OR q9a/q9b = true = red (ความเสี่ยงสูง)
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

    // Special case: q9a/q9b = true → red immediately
    if (scores.q9a || scores.q9b) {
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

export function canReferPhqToHospital(scores: PhqScores): boolean {
    return calculateRiskLevel(scores).riskLevel === "red";
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
