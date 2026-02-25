import { describe, it, expect } from "vitest";
import {
    calculateRiskLevel,
    calculateTotalScore,
    type PhqScores,
    type RiskLevel,
} from "@/lib/utils/phq-scoring";
import { RISK_LEVEL_CONFIG } from "@/lib/constants/risk-levels";

/**
 * Helper function to create PHQ scores for testing
 */
function createScores(overrides: Partial<PhqScores> = {}): PhqScores {
    return {
        q1: 0,
        q2: 0,
        q3: 0,
        q4: 0,
        q5: 0,
        q6: 0,
        q7: 0,
        q8: 0,
        q9: 0,
        q9a: false,
        q9b: false,
        ...overrides,
    };
}

describe("calculateTotalScore", () => {
    it("should return 0 for all zeros", () => {
        const scores = createScores();
        expect(calculateTotalScore(scores)).toBe(0);
    });

    it("should calculate correct total for all 1s", () => {
        const scores = createScores({
            q1: 1,
            q2: 1,
            q3: 1,
            q4: 1,
            q5: 1,
            q6: 1,
            q7: 1,
            q8: 1,
            q9: 1,
        });
        expect(calculateTotalScore(scores)).toBe(9);
    });

    it("should calculate correct total for maximum scores", () => {
        const scores = createScores({
            q1: 3,
            q2: 3,
            q3: 3,
            q4: 3,
            q5: 3,
            q6: 3,
            q7: 3,
            q8: 3,
            q9: 3,
        });
        expect(calculateTotalScore(scores)).toBe(27);
    });

    it("should ignore q9a and q9b in total calculation", () => {
        const scores = createScores({
            q1: 1,
            q2: 1,
            q9a: true,
            q9b: true,
        });
        expect(calculateTotalScore(scores)).toBe(2);
    });
});

describe("calculateRiskLevel", () => {
    describe("Risk Level: Blue (ปกติ)", () => {
        it("should return blue for score 0", () => {
            const scores = createScores();
            const result = calculateRiskLevel(scores);
            expect(result.riskLevel).toBe("blue");
            expect(result.totalScore).toBe(0);
            expect(result.riskLabel).toBe("ปกติ");
        });

        it("should return blue for score 4", () => {
            const scores = createScores({ q1: 1, q2: 1, q3: 1, q4: 1 });
            const result = calculateRiskLevel(scores);
            expect(result.riskLevel).toBe("blue");
            expect(result.totalScore).toBe(4);
        });
    });

    describe("Risk Level: Green (เฝ้าระวังเล็กน้อย)", () => {
        it("should return green for score 5", () => {
            const scores = createScores({ q1: 1, q2: 1, q3: 1, q4: 1, q5: 1 });
            const result = calculateRiskLevel(scores);
            expect(result.riskLevel).toBe("green");
            expect(result.totalScore).toBe(5);
        });

        it("should return green for score 9", () => {
            const scores = createScores({
                q1: 1,
                q2: 1,
                q3: 1,
                q4: 1,
                q5: 1,
                q6: 1,
                q7: 1,
                q8: 1,
                q9: 1,
            });
            const result = calculateRiskLevel(scores);
            expect(result.riskLevel).toBe("green");
            expect(result.totalScore).toBe(9);
        });
    });

    describe("Risk Level: Yellow (เฝ้าระวังปานกลาง)", () => {
        it("should return yellow for score 10", () => {
            const scores = createScores({
                q1: 2,
                q2: 2,
                q3: 2,
                q4: 2,
                q5: 2,
            });
            const result = calculateRiskLevel(scores);
            expect(result.riskLevel).toBe("yellow");
            expect(result.totalScore).toBe(10);
        });

        it("should return yellow for score 14", () => {
            const scores = createScores({
                q1: 2,
                q2: 2,
                q3: 2,
                q4: 2,
                q5: 2,
                q6: 2,
                q7: 2,
            });
            const result = calculateRiskLevel(scores);
            expect(result.riskLevel).toBe("yellow");
            expect(result.totalScore).toBe(14);
        });
    });

    describe("Risk Level: Orange (มีความเสี่ยง)", () => {
        it("should return orange for score 15", () => {
            const scores = createScores({
                q1: 2,
                q2: 2,
                q3: 2,
                q4: 2,
                q5: 2,
                q6: 2,
                q7: 2,
                q8: 1,
            });
            const result = calculateRiskLevel(scores);
            expect(result.riskLevel).toBe("orange");
            expect(result.totalScore).toBe(15);
        });

        it("should return orange for score 19", () => {
            const scores = createScores({
                q1: 3,
                q2: 2,
                q3: 2,
                q4: 2,
                q5: 2,
                q6: 2,
                q7: 2,
                q8: 2,
                q9: 2,
            });
            const result = calculateRiskLevel(scores);
            expect(result.riskLevel).toBe("orange");
            expect(result.totalScore).toBe(19);
        });
    });

    describe("Risk Level: Red (ความเสี่ยงสูง)", () => {
        it("should return red for score 20", () => {
            const scores = createScores({
                q1: 3,
                q2: 3,
                q3: 3,
                q4: 3,
                q5: 3,
                q6: 2,
                q7: 2,
                q8: 1,
            });
            const result = calculateRiskLevel(scores);
            expect(result.riskLevel).toBe("red");
            expect(result.totalScore).toBe(20);
        });

        it("should return red for maximum score 27", () => {
            const scores = createScores({
                q1: 3,
                q2: 3,
                q3: 3,
                q4: 3,
                q5: 3,
                q6: 3,
                q7: 3,
                q8: 3,
                q9: 3,
            });
            const result = calculateRiskLevel(scores);
            expect(result.riskLevel).toBe("red");
            expect(result.totalScore).toBe(27);
        });

        it("should return red immediately if q9a is true (regardless of score)", () => {
            const scores = createScores({ q9a: true });
            const result = calculateRiskLevel(scores);
            expect(result.riskLevel).toBe("red");
            expect(result.totalScore).toBe(0);
        });

        it("should ignore q9b and not force red level", () => {
            const scores = createScores({ q9b: true });
            const result = calculateRiskLevel(scores);
            expect(result.riskLevel).toBe("blue");
            expect(result.totalScore).toBe(0);
        });

        it("should return red for q9a=true even with low score", () => {
            const scores = createScores({ q1: 1, q2: 1, q9a: true });
            const result = calculateRiskLevel(scores);
            expect(result.riskLevel).toBe("red");
            expect(result.totalScore).toBe(2);
        });
    });

    describe("Risk Colors and Labels", () => {
        it("should return correct color for each risk level", () => {
            const testCases: Array<{
                scores: Partial<PhqScores>;
                expectedLevel: RiskLevel;
                expectedColor: string;
            }> = [
                {
                    scores: {},
                    expectedLevel: "blue",
                    expectedColor: RISK_LEVEL_CONFIG.blue.hexColor,
                },
                {
                    scores: { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1 },
                    expectedLevel: "green",
                    expectedColor: RISK_LEVEL_CONFIG.green.hexColor,
                },
                {
                    scores: { q1: 2, q2: 2, q3: 2, q4: 2, q5: 2 },
                    expectedLevel: "yellow",
                    expectedColor: RISK_LEVEL_CONFIG.yellow.hexColor,
                },
                {
                    scores: {
                        q1: 2,
                        q2: 2,
                        q3: 2,
                        q4: 2,
                        q5: 2,
                        q6: 2,
                        q7: 2,
                        q8: 1,
                    },
                    expectedLevel: "orange",
                    expectedColor: RISK_LEVEL_CONFIG.orange.hexColor,
                },
                {
                    scores: {
                        q1: 3,
                        q2: 3,
                        q3: 3,
                        q4: 3,
                        q5: 3,
                        q6: 2,
                        q7: 2,
                        q8: 1,
                    },
                    expectedLevel: "red",
                    expectedColor: RISK_LEVEL_CONFIG.red.hexColor,
                },
            ];

            testCases.forEach(({ scores, expectedLevel, expectedColor }) => {
                const result = calculateRiskLevel(createScores(scores));
                expect(result.riskLevel).toBe(expectedLevel);
                expect(result.riskColor).toBe(expectedColor);
            });
        });
    });
});
