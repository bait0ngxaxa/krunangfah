import { describe, expect, it } from "vitest";
import {
    buildScreeningScopeLabel,
    formatResultTermLabel,
    isNotScreenedThisTerm,
} from "@/lib/utils/student-result-term";

const result = {
    assessmentRound: 1,
    academicYear: { id: "term-1", year: 2568, semester: 2 },
};

describe("student result term", () => {
    it("formats year/semester and round", () => {
        expect(formatResultTermLabel(result)).toBe("2568/2 รอบ 1");
        expect(formatResultTermLabel({ academicYear: result.academicYear })).toBe(
            "2568/2",
        );
        expect(formatResultTermLabel(undefined)).toBeNull();
        expect(formatResultTermLabel({ assessmentRound: 1 })).toBeNull();
    });

    it("flags a result from a term other than the current one", () => {
        expect(isNotScreenedThisTerm(result, "term-2")).toBe(true);
        expect(isNotScreenedThisTerm(result, "term-1")).toBe(false);
    });

    it("never flags when the current term or the result term is unknown", () => {
        expect(isNotScreenedThisTerm(result, null)).toBe(false);
        expect(isNotScreenedThisTerm(undefined, "term-1")).toBe(false);
        expect(isNotScreenedThisTerm({ assessmentRound: 1 }, "term-1")).toBe(false);
    });
});

describe("buildScreeningScopeLabel", () => {
    it("names the latest-result view when no term is selected", () => {
        expect(
            buildScreeningScopeLabel({ isTermSelected: false, selectedTerm: null }),
        ).toBe("ผลคัดกรองล่าสุดของนักเรียนแต่ละคน");
    });

    it("names the selected term, and the round when one is selected", () => {
        const selectedTerm = { year: 2568, semester: 2 };
        expect(
            buildScreeningScopeLabel({ isTermSelected: true, selectedTerm }),
        ).toBe("ผลคัดกรอง ปีการศึกษา 2568 เทอม 2");
        expect(
            buildScreeningScopeLabel({
                isTermSelected: true,
                selectedTerm,
                assessmentRound: 1,
            }),
        ).toBe("ผลคัดกรอง ปีการศึกษา 2568 เทอม 2 รอบ 1");
    });

    it("never claims the latest-result view for an unknown selected term", () => {
        expect(
            buildScreeningScopeLabel({ isTermSelected: true, selectedTerm: null }),
        ).toBe("ผลคัดกรองเทอมที่เลือก");
    });
});
