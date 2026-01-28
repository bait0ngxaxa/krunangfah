/**
 * PHQ-A Scoring Utility
 * คำนวณระดับความเสี่ยงจากคะแนน PHQ-A
 */

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

/**
 * Risk level labels in Thai
 */
export const RISK_LABELS: Record<RiskLevel, string> = {
    blue: "ปกติ",
    green: "เฝ้าระวังเล็กน้อย",
    yellow: "เฝ้าระวังปานกลาง",
    orange: "มีความเสี่ยง",
    red: "ความเสี่ยงสูง",
};

/**
 * Risk level colors for UI
 */
export const RISK_COLORS: Record<RiskLevel, string> = {
    blue: "#3B82F6",
    green: "#22C55E",
    yellow: "#EAB308",
    orange: "#F97316",
    red: "#EF4444",
};

/**
 * Risk level Tailwind classes
 */
export const RISK_BG_CLASSES: Record<RiskLevel, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
};

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

    // Special case: q9a or q9b = true → red immediately
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

    return {
        totalScore,
        riskLevel,
        riskLabel: RISK_LABELS[riskLevel],
        riskColor: RISK_COLORS[riskLevel],
    };
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
