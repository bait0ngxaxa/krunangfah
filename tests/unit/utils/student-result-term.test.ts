import { describe, expect, it } from "vitest";
import {
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
