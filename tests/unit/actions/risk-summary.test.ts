import { describe, it, expect } from "vitest";
import { calculateRiskLevelSummary } from "@/lib/actions/analytics/risk-summary";
import { RISK_LEVEL_CONFIG } from "@/lib/constants/risk-levels";

describe("calculateRiskLevelSummary", () => {
    it("should count students by risk level", async () => {
        const assessments = new Map([
            ["student-1", { riskLevel: "blue", referredToHospital: false }],
            ["student-2", { riskLevel: "blue", referredToHospital: false }],
            ["student-3", { riskLevel: "green", referredToHospital: false }],
            ["student-4", { riskLevel: "yellow", referredToHospital: false }],
            ["student-5", { riskLevel: "orange", referredToHospital: true }],
            ["student-6", { riskLevel: "red", referredToHospital: true }],
        ]);

        const result = await calculateRiskLevelSummary(assessments);

        expect(result).toHaveLength(5);

        const blue = result.find((r) => r.riskLevel === "blue");
        expect(blue!.count).toBe(2);
        expect(blue!.referralCount).toBe(0);

        const orange = result.find((r) => r.riskLevel === "orange");
        expect(orange!.count).toBe(1);
        expect(orange!.referralCount).toBe(1);

        const red = result.find((r) => r.riskLevel === "red");
        expect(red!.count).toBe(1);
        expect(red!.referralCount).toBe(1);
    });

    it("should calculate percentages correctly", async () => {
        const assessments = new Map([
            ["s1", { riskLevel: "blue", referredToHospital: false }],
            ["s2", { riskLevel: "blue", referredToHospital: false }],
            ["s3", { riskLevel: "green", referredToHospital: false }],
            ["s4", { riskLevel: "green", referredToHospital: false }],
        ]);

        const result = await calculateRiskLevelSummary(assessments);

        const blue = result.find((r) => r.riskLevel === "blue");
        expect(blue!.percentage).toBeCloseTo(50, 1);

        const green = result.find((r) => r.riskLevel === "green");
        expect(green!.percentage).toBeCloseTo(50, 1);

        const red = result.find((r) => r.riskLevel === "red");
        expect(red!.percentage).toBe(0);
    });

    it("should return all risk levels even with empty input", async () => {
        const assessments = new Map<
            string,
            { riskLevel: string; referredToHospital: boolean }
        >();

        const result = await calculateRiskLevelSummary(assessments);

        expect(result).toHaveLength(5);
        result.forEach((r) => {
            expect(r.count).toBe(0);
            expect(r.percentage).toBe(0);
            expect(r.referralCount).toBe(0);
        });
    });

    it("should count referrals per risk level independently", async () => {
        const assessments = new Map([
            ["s1", { riskLevel: "orange", referredToHospital: true }],
            ["s2", { riskLevel: "orange", referredToHospital: false }],
            ["s3", { riskLevel: "orange", referredToHospital: true }],
            ["s4", { riskLevel: "red", referredToHospital: true }],
        ]);

        const result = await calculateRiskLevelSummary(assessments);

        const orange = result.find((r) => r.riskLevel === "orange");
        expect(orange!.count).toBe(3);
        expect(orange!.referralCount).toBe(2);

        const red = result.find((r) => r.riskLevel === "red");
        expect(red!.count).toBe(1);
        expect(red!.referralCount).toBe(1);
    });

    it("should include label and color from config", async () => {
        const assessments = new Map<
            string,
            { riskLevel: string; referredToHospital: boolean }
        >();

        const result = await calculateRiskLevelSummary(assessments);

        const blue = result.find((r) => r.riskLevel === "blue");
        expect(blue!.label).toBe("ปกติ");
        expect(blue!.color).toBe(RISK_LEVEL_CONFIG.blue.hexColor);

        const yellow = result.find((r) => r.riskLevel === "yellow");
        expect(yellow!.label).toBe("เสี่ยงปานกลาง");
    });

    it("should ignore unknown risk levels", async () => {
        const assessments = new Map([
            ["s1", { riskLevel: "purple", referredToHospital: false }],
            ["s2", { riskLevel: "blue", referredToHospital: false }],
        ]);

        const result = await calculateRiskLevelSummary(assessments);

        // "purple" should not be counted in any level
        const blue = result.find((r) => r.riskLevel === "blue");
        expect(blue!.count).toBe(1);

        // Total across all levels should be 1 (only blue)
        const totalCount = result.reduce((sum, r) => sum + r.count, 0);
        expect(totalCount).toBe(1);
    });

    it("should handle single student correctly", async () => {
        const assessments = new Map([
            ["s1", { riskLevel: "red", referredToHospital: true }],
        ]);

        const result = await calculateRiskLevelSummary(assessments);

        const red = result.find((r) => r.riskLevel === "red");
        expect(red!.count).toBe(1);
        expect(red!.percentage).toBe(100);
        expect(red!.referralCount).toBe(1);
    });
});
