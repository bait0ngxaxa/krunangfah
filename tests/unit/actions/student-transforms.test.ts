import { describe, it, expect } from "vitest";
import { transformRiskCounts } from "@/lib/actions/student/transforms";
import type { RiskCountRaw } from "@/lib/actions/student/types";

describe("transformRiskCounts", () => {
    it("should transform raw risk counts to RiskCountsResponse", () => {
        const rawCounts: RiskCountRaw[] = [
            { risk_level: "blue", count: BigInt(10) },
            { risk_level: "green", count: BigInt(5) },
            { risk_level: "yellow", count: BigInt(3) },
            { risk_level: "orange", count: BigInt(2) },
            { risk_level: "red", count: BigInt(1) },
        ];
        const classes = ["ม.5/1", "ม.5/2"];

        const result = transformRiskCounts(rawCounts, classes);

        expect(result.blue).toBe(10);
        expect(result.green).toBe(5);
        expect(result.yellow).toBe(3);
        expect(result.orange).toBe(2);
        expect(result.red).toBe(1);
        expect(result.total).toBe(21);
        expect(result.classes).toEqual(["ม.5/1", "ม.5/2"]);
    });

    it("should handle empty raw counts", () => {
        const result = transformRiskCounts([], ["ม.1/1"]);

        expect(result.blue).toBe(0);
        expect(result.green).toBe(0);
        expect(result.yellow).toBe(0);
        expect(result.orange).toBe(0);
        expect(result.red).toBe(0);
        expect(result.total).toBe(0);
        expect(result.classes).toEqual(["ม.1/1"]);
    });

    it("should handle empty classes", () => {
        const rawCounts: RiskCountRaw[] = [
            { risk_level: "blue", count: BigInt(5) },
        ];

        const result = transformRiskCounts(rawCounts, []);

        expect(result.blue).toBe(5);
        expect(result.total).toBe(5);
        expect(result.classes).toEqual([]);
    });

    it("should convert BigInt to number", () => {
        const rawCounts: RiskCountRaw[] = [
            { risk_level: "red", count: BigInt(999) },
        ];

        const result = transformRiskCounts(rawCounts, []);

        expect(typeof result.red).toBe("number");
        expect(result.red).toBe(999);
    });

    it("should ignore unknown risk levels", () => {
        const rawCounts: RiskCountRaw[] = [
            { risk_level: "purple", count: BigInt(100) },
            { risk_level: "blue", count: BigInt(5) },
        ];

        const result = transformRiskCounts(rawCounts, []);

        expect(result.blue).toBe(5);
        expect(result.total).toBe(5); // "purple" should NOT be counted
    });

    it("should calculate total as sum of all valid risk levels", () => {
        const rawCounts: RiskCountRaw[] = [
            { risk_level: "red", count: BigInt(1) },
            { risk_level: "orange", count: BigInt(2) },
            { risk_level: "yellow", count: BigInt(3) },
        ];

        const result = transformRiskCounts(rawCounts, []);

        expect(result.total).toBe(6);
        // Green and blue should still be 0
        expect(result.green).toBe(0);
        expect(result.blue).toBe(0);
    });

    it("should handle partial risk levels (not all present)", () => {
        const rawCounts: RiskCountRaw[] = [
            { risk_level: "blue", count: BigInt(20) },
        ];

        const result = transformRiskCounts(rawCounts, ["ม.6/1"]);

        expect(result.blue).toBe(20);
        expect(result.red).toBe(0);
        expect(result.orange).toBe(0);
        expect(result.yellow).toBe(0);
        expect(result.green).toBe(0);
        expect(result.total).toBe(20);
    });
});
