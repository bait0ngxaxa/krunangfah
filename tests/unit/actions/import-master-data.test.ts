import { describe, expect, it } from "vitest";
import {
    isOlderThanLatestPhq,
    planImportStudentUpdates,
} from "@/lib/actions/student/import-master-data";
import type { ImportStudentRecord } from "@/lib/actions/student/import-identity";
import type { ParsedStudent } from "@/lib/utils/excel-parser";

const NOW = new Date("2026-11-27T03:00:00.000Z");

function phq(
    year: number,
    semester: number,
    assessmentRound: number,
    createdAt: string,
): ImportStudentRecord["phqResults"][number] {
    return {
        id: `phq-${year}-${semester}-${assessmentRound}`,
        assessmentRound,
        createdAt: new Date(createdAt),
        academicYear: { startDate: new Date("2026-04-30T17:00:00.000Z"), year, semester },
    };
}

const stored: ImportStudentRecord = {
    id: "student-1",
    nationalId: null,
    firstName: "สมชาย",
    lastName: "ทดสอบ",
    class: "ม.1/2",
    gender: "MALE",
    age: 14,
    // createdAt order differs from academic chronology on purpose.
    phqResults: [
        phq(2569, 1, 2, "2026-11-20T00:00:00.000Z"),
        phq(2569, 2, 1, "2026-11-10T00:00:00.000Z"),
        phq(2569, 1, 1, "2026-06-01T00:00:00.000Z"),
    ],
};

const olderRow: ParsedStudent = {
    studentId: "MDG-001",
    nationalId: null,
    firstName: "สมชา",
    lastName: "ทดสอบ",
    gender: "MALE",
    age: 13,
    class: "ม.1/1",
    scores: { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q9a: false, q9b: false },
};

describe("isOlderThanLatestPhq", () => {
    it("compares against the latest PHQ by academic chronology, not createdAt", () => {
        expect(isOlderThanLatestPhq({ year: 2569, semester: 1, assessmentRound: 2 }, stored.phqResults, NOW))
            .toBe(true);
    });

    it.each([
        { label: "a later semester", context: { year: 2569, semester: 2, assessmentRound: 2 } },
        { label: "a later year", context: { year: 2570, semester: 1, assessmentRound: 1 } },
    ])("treats $label as newer", ({ context }) => {
        expect(isOlderThanLatestPhq(context, stored.phqResults, NOW)).toBe(false);
    });

    it("treats an earlier year as older", () => {
        expect(isOlderThanLatestPhq({ year: 2568, semester: 2, assessmentRound: 2 }, stored.phqResults, NOW))
            .toBe(true);
    });

    it("treats a student without PHQ history as not older", () => {
        expect(isOlderThanLatestPhq({ year: 2560, semester: 1, assessmentRound: 1 }, [], NOW)).toBe(false);
    });

    it("treats round 2 after round 1 of the same term as newer", () => {
        const roundOneOnly = [phq(2569, 1, 1, "2026-06-01T00:00:00.000Z")];
        expect(isOlderThanLatestPhq({ year: 2569, semester: 1, assessmentRound: 2 }, roundOneOnly, NOW))
            .toBe(false);
    });
});

describe("planImportStudentUpdates", () => {
    it("keeps every master field for an older context and reports it", () => {
        expect(planImportStudentUpdates(stored, olderRow, true)).toEqual({
            updates: {},
            masterDataPreserved: true,
        });
    });

    it("still fills a missing national ID for an older context", () => {
        const plan = planImportStudentUpdates(stored, { ...olderRow, nationalId: "G0000000000001" }, true);
        expect(plan).toEqual({ updates: { nationalId: "G0000000000001" }, masterDataPreserved: true });
    });

    it("does not report preservation when nothing would have changed", () => {
        const sameRow = { ...olderRow, firstName: "สมชาย", age: 14, class: "ม.1/2" };
        expect(planImportStudentUpdates(stored, sameRow, true)).toEqual({
            updates: {},
            masterDataPreserved: false,
        });
    });

    it("applies every changed field for a newer context", () => {
        expect(planImportStudentUpdates(stored, olderRow, false)).toEqual({
            updates: { firstName: "สมชา", age: 13, class: "ม.1/1" },
            masterDataPreserved: false,
        });
    });

    it("never replaces an existing national ID", () => {
        const withId = { ...stored, nationalId: "G0000000000009" };
        const plan = planImportStudentUpdates(withId, { ...olderRow, nationalId: "G0000000000001" }, false);
        expect(plan.updates).not.toHaveProperty("nationalId");
    });
});
