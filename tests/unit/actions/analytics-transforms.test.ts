import { describe, it, expect } from "vitest";
import { RISK_LEVEL_CONFIG } from "@/lib/constants/risk-levels";
import {
    transformRiskLevelCounts,
    transformTrendData,
    transformGradeRiskData,
    transformActivityProgress,
    transformHospitalReferrals,
} from "@/lib/actions/analytics/transforms";

describe("transformRiskLevelCounts", () => {
    it("should transform raw results to RiskLevelSummary", () => {
        const rawResults = [
            {
                risk_level: "blue",
                count: BigInt(10),
                referral_count: BigInt(0),
            },
            {
                risk_level: "green",
                count: BigInt(5),
                referral_count: BigInt(0),
            },
            {
                risk_level: "yellow",
                count: BigInt(3),
                referral_count: BigInt(1),
            },
            {
                risk_level: "orange",
                count: BigInt(2),
                referral_count: BigInt(2),
            },
            { risk_level: "red", count: BigInt(1), referral_count: BigInt(1) },
        ];

        const result = transformRiskLevelCounts(rawResults, 21);

        expect(result).toHaveLength(5);

        const blue = result.find((r) => r.riskLevel === "blue");
        expect(blue).toBeDefined();
        expect(blue!.count).toBe(10);
        expect(blue!.referralCount).toBe(0);
        expect(blue!.percentage).toBeCloseTo((10 / 21) * 100, 1);
    });

    it("should include all risk levels even when absent from raw data", () => {
        const rawResults = [
            { risk_level: "blue", count: BigInt(5), referral_count: BigInt(0) },
        ];

        const result = transformRiskLevelCounts(rawResults, 5);

        expect(result).toHaveLength(5);

        const red = result.find((r) => r.riskLevel === "red");
        expect(red).toBeDefined();
        expect(red!.count).toBe(0);
        expect(red!.percentage).toBe(0);
        expect(red!.referralCount).toBe(0);
    });

    it("should handle empty raw results", () => {
        const result = transformRiskLevelCounts([], 0);

        expect(result).toHaveLength(5);
        result.forEach((r) => {
            expect(r.count).toBe(0);
            expect(r.percentage).toBe(0);
            expect(r.referralCount).toBe(0);
        });
    });

    it("should set percentage to 0 when totalStudentsWithAssessment is 0", () => {
        const rawResults = [
            { risk_level: "blue", count: BigInt(0), referral_count: BigInt(0) },
        ];
        const result = transformRiskLevelCounts(rawResults, 0);

        result.forEach((r) => {
            expect(r.percentage).toBe(0);
        });
    });

    it("should include label and color from RISK_LEVEL_CONFIG", () => {
        const result = transformRiskLevelCounts([], 0);

        const blue = result.find((r) => r.riskLevel === "blue");
        expect(blue!.label).toBe("ปกติ");
        expect(blue!.color).toBe(RISK_LEVEL_CONFIG.blue.hexColor);

        const red = result.find((r) => r.riskLevel === "red");
        expect(red!.label).toBe("เสี่ยงสูงมาก");
        expect(red!.color).toBe(RISK_LEVEL_CONFIG.red.hexColor);
    });
});

describe("transformTrendData", () => {
    it("should group raw results by period", () => {
        const rawResults = [
            {
                academic_year: 2568,
                semester: 1,
                assessment_round: 1,
                risk_level: "blue",
                count: BigInt(10),
            },
            {
                academic_year: 2568,
                semester: 1,
                assessment_round: 1,
                risk_level: "green",
                count: BigInt(5),
            },
            {
                academic_year: 2568,
                semester: 1,
                assessment_round: 1,
                risk_level: "red",
                count: BigInt(1),
            },
        ];

        const result = transformTrendData(rawResults);

        expect(result).toHaveLength(1);
        expect(result[0].period).toBe("ต้นเทอม/1");
        expect(result[0].academicYear).toBe(2568);
        expect(result[0].semester).toBe(1);
        expect(result[0].round).toBe(1);
        expect(result[0].blue).toBe(10);
        expect(result[0].green).toBe(5);
        expect(result[0].red).toBe(1);
        expect(result[0].yellow).toBe(0);
        expect(result[0].orange).toBe(0);
    });

    it("should use 'ปลายเทอม' for round 2", () => {
        const rawResults = [
            {
                academic_year: 2568,
                semester: 2,
                assessment_round: 2,
                risk_level: "blue",
                count: BigInt(3),
            },
        ];

        const result = transformTrendData(rawResults);
        expect(result[0].period).toBe("ปลายเทอม/2");
        expect(result[0].round).toBe(2);
    });

    it("should handle multiple periods", () => {
        const rawResults = [
            {
                academic_year: 2568,
                semester: 1,
                assessment_round: 1,
                risk_level: "blue",
                count: BigInt(10),
            },
            {
                academic_year: 2568,
                semester: 1,
                assessment_round: 2,
                risk_level: "blue",
                count: BigInt(12),
            },
            {
                academic_year: 2568,
                semester: 2,
                assessment_round: 1,
                risk_level: "green",
                count: BigInt(8),
            },
        ];

        const result = transformTrendData(rawResults);
        expect(result).toHaveLength(3);
    });

    it("should handle empty input", () => {
        const result = transformTrendData([]);
        expect(result).toEqual([]);
    });

    it("should ignore unknown risk levels in counts", () => {
        const rawResults = [
            {
                academic_year: 2568,
                semester: 1,
                assessment_round: 1,
                risk_level: "unknown_level",
                count: BigInt(5),
            },
            {
                academic_year: 2568,
                semester: 1,
                assessment_round: 1,
                risk_level: "blue",
                count: BigInt(3),
            },
        ];

        const result = transformTrendData(rawResults);
        expect(result).toHaveLength(1);
        expect(result[0].blue).toBe(3);
    });
});

describe("transformGradeRiskData", () => {
    it("should group risk counts by grade", () => {
        const rawResults = [
            { grade: "ม.5", risk_level: "blue", count: BigInt(10) },
            { grade: "ม.5", risk_level: "green", count: BigInt(5) },
            { grade: "ม.6", risk_level: "red", count: BigInt(2) },
        ];

        const result = transformGradeRiskData(rawResults);

        expect(result).toHaveLength(2);

        const m5 = result.find((r) => r.grade === "ม.5");
        expect(m5!.blue).toBe(10);
        expect(m5!.green).toBe(5);
        expect(m5!.total).toBe(15);
    });

    it("should calculate total correctly", () => {
        const rawResults = [
            { grade: "ม.1", risk_level: "blue", count: BigInt(2) },
            { grade: "ม.1", risk_level: "green", count: BigInt(3) },
            { grade: "ม.1", risk_level: "yellow", count: BigInt(4) },
            { grade: "ม.1", risk_level: "orange", count: BigInt(5) },
            { grade: "ม.1", risk_level: "red", count: BigInt(1) },
        ];

        const result = transformGradeRiskData(rawResults);
        expect(result[0].total).toBe(15);
    });

    it("should sort grades by number (natural sort)", () => {
        const rawResults = [
            { grade: "ม.6", risk_level: "blue", count: BigInt(1) },
            { grade: "ม.1", risk_level: "blue", count: BigInt(1) },
            { grade: "ม.3", risk_level: "blue", count: BigInt(1) },
        ];

        const result = transformGradeRiskData(rawResults);
        expect(result[0].grade).toBe("ม.1");
        expect(result[1].grade).toBe("ม.3");
        expect(result[2].grade).toBe("ม.6");
    });

    it("should handle empty input", () => {
        const result = transformGradeRiskData([]);
        expect(result).toEqual([]);
    });
});

describe("transformActivityProgress", () => {
    it("should transform raw activity data to ActivityProgressByRisk", () => {
        const rawResults = [
            {
                risk_level: "orange",
                total_students: BigInt(10),
                activity1: BigInt(8),
                activity2: BigInt(6),
                activity3: BigInt(4),
                activity4: BigInt(2),
                activity5: BigInt(1),
            },
        ];

        const result = transformActivityProgress(rawResults);

        const orange = result.find((r) => r.riskLevel === "orange");
        expect(orange).toBeDefined();
        expect(orange!.totalStudents).toBe(10);
        expect(orange!.activity1).toBe(8);
        expect(orange!.noActivity).toBe(2); // 10 - max(8,6,4,2,1) = 2
    });

    it("should include all 5 risk levels even when absent from data", () => {
        const result = transformActivityProgress([]);
        expect(result).toHaveLength(5);
        result.forEach((r) => {
            expect(r.totalStudents).toBe(0);
            expect(r.noActivity).toBe(0);
            expect(r.activity1).toBe(0);
        });
    });

    it("should set noActivity to 0 when max activity count equals total", () => {
        const rawResults = [
            {
                risk_level: "yellow",
                total_students: BigInt(5),
                activity1: BigInt(5),
                activity2: BigInt(3),
                activity3: BigInt(2),
                activity4: BigInt(0),
                activity5: BigInt(0),
            },
        ];

        const result = transformActivityProgress(rawResults);
        const yellow = result.find((r) => r.riskLevel === "yellow");
        expect(yellow!.noActivity).toBe(0); // 5 - max(5,...) = 0
    });

    it("should include label and color from config", () => {
        const result = transformActivityProgress([]);
        const red = result.find((r) => r.riskLevel === "red");
        expect(red!.label).toBe("เสี่ยงสูงมาก");
        expect(red!.color).toBe("#EF4444");
    });
});

describe("transformHospitalReferrals", () => {
    it("should transform raw referral data", () => {
        const rawResults = [
            { grade: "ม.5", referral_count: BigInt(3) },
            { grade: "ม.6", referral_count: BigInt(1) },
        ];

        const result = transformHospitalReferrals(rawResults);

        expect(result).toHaveLength(2);
        expect(result[0].grade).toBe("ม.5");
        expect(result[0].referralCount).toBe(3);
    });

    it("should sort grades by number (natural sort)", () => {
        const rawResults = [
            { grade: "ม.6", referral_count: BigInt(2) },
            { grade: "ม.1", referral_count: BigInt(5) },
            { grade: "ม.3", referral_count: BigInt(1) },
        ];

        const result = transformHospitalReferrals(rawResults);
        expect(result[0].grade).toBe("ม.1");
        expect(result[1].grade).toBe("ม.3");
        expect(result[2].grade).toBe("ม.6");
    });

    it("should handle empty input", () => {
        const result = transformHospitalReferrals([]);
        expect(result).toEqual([]);
    });

    it("should convert BigInt to number", () => {
        const rawResults = [{ grade: "ม.4", referral_count: BigInt(999) }];

        const result = transformHospitalReferrals(rawResults);
        expect(typeof result[0].referralCount).toBe("number");
        expect(result[0].referralCount).toBe(999);
    });
});
