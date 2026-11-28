import { describe, expect, it } from "vitest";
import {
    calculateScreeningCoverage,
    mergeClassCoverageCounts,
    type ClassCoverageCount,
} from "@/lib/actions/analytics/coverage";

function classCount(
    className: string,
    expected: number,
    assessed: number,
    schoolId = "school-1",
): ClassCoverageCount {
    return { schoolId, className, expected, assessed };
}

describe("calculateScreeningCoverage", () => {
    it("caps an over-counted class so it cannot hide another class's gap", () => {
        const coverage = calculateScreeningCoverage([
            classCount("ม.1/1", 30, 35),
            classCount("ม.1/2", 30, 25),
        ]);

        expect(coverage).toEqual({
            coveragePercent: 92,
            expectedTotal: 60,
            covered: 55,
            studentsWithoutAssessment: 5,
            mismatches: [{ className: "ม.1/1", expected: 30, assessed: 35 }],
            uncountedStudents: 5,
            schoolsWithMismatch: 1,
        });
    });

    it("reports 100% and no mismatch when every class is exact", () => {
        const coverage = calculateScreeningCoverage([
            classCount("ม.1/1", 30, 30),
            classCount("ม.1/2", 28, 28),
        ]);

        expect(coverage.coveragePercent).toBe(100);
        expect(coverage.studentsWithoutAssessment).toBe(0);
        expect(coverage.mismatches).toEqual([]);
        expect(coverage.uncountedStudents).toBe(0);
    });

    it("has no percent when nothing is planned, and lists the screened class as a mismatch", () => {
        const coverage = calculateScreeningCoverage([classCount("ม.1/1", 0, 4)]);

        expect(coverage.coveragePercent).toBeNull();
        expect(coverage.mismatches).toEqual([
            { className: "ม.1/1", expected: 0, assessed: 4 },
        ]);
        expect(coverage.uncountedStudents).toBe(4);
    });

    it("has no percent without classes", () => {
        expect(calculateScreeningCoverage([])).toMatchObject({
            coveragePercent: null,
            expectedTotal: 0,
            studentsWithoutAssessment: 0,
            mismatches: [],
            uncountedStudents: 0,
            schoolsWithMismatch: 0,
        });
    });

    it("sorts mismatches by the over-count, largest first", () => {
        const coverage = calculateScreeningCoverage([
            classCount("ม.1/1", 30, 31),
            classCount("ม.1/2", 30, 40),
            classCount("ม.1/3", 0, 5),
        ]);

        expect(coverage.mismatches.map((row) => row.className)).toEqual([
            "ม.1/2",
            "ม.1/3",
            "ม.1/1",
        ]);
    });

    it("counts schools with a mismatch once each", () => {
        const coverage = calculateScreeningCoverage([
            classCount("ม.1/1", 10, 12, "school-a"),
            classCount("ม.1/2", 10, 11, "school-a"),
            classCount("ม.1/1", 10, 8, "school-b"),
        ]);

        expect(coverage.schoolsWithMismatch).toBe(1);
        expect(coverage.coveragePercent).toBe(93);
    });
});

describe("mergeClassCoverageCounts", () => {
    it("keeps a screened class without a term row, with expected 0", () => {
        const merged = mergeClassCoverageCounts(
            [{ schoolId: "school-1", className: "ม.1/1", expected: 30 }],
            [
                { schoolId: "school-1", className: "ม.1/1", assessed: 20 },
                { schoolId: "school-1", className: "ม.9/9", assessed: 2 },
            ],
        );

        expect(merged).toEqual([
            classCount("ม.1/1", 30, 20),
            classCount("ม.9/9", 0, 2),
        ]);
        expect(merged.reduce((sum, row) => sum + row.assessed, 0)).toBe(22);
    });

    it("keeps equal class names of different schools apart", () => {
        const merged = mergeClassCoverageCounts(
            [
                { schoolId: "school-a", className: "ม.1/1", expected: 10 },
                { schoolId: "school-b", className: "ม.1/1", expected: 20 },
            ],
            [{ schoolId: "school-b", className: "ม.1/1", assessed: 5 }],
        );

        expect(merged).toEqual([
            classCount("ม.1/1", 10, 0, "school-a"),
            classCount("ม.1/1", 20, 5, "school-b"),
        ]);
    });
});
