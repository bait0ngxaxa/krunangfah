import { describe, expect, it } from "vitest";
import {
    findInBatchZeroKeyConflicts,
    indexTextIdsByZeroKey,
    parseImportStudentsOptions,
    resolveNumericStudentIdentity,
    zeroKey,
    type StoredImportStudent,
} from "@/lib/actions/student/import-identity";
import type { ParsedStudent } from "@/lib/utils/excel-parser";

const row: ParsedStudent = {
    studentId: "123",
    numericStudentId: true,
    nationalId: null,
    firstName: "สมชาย",
    lastName: "ใจดี",
    gender: "MALE",
    age: 13,
    class: "ม.1/1",
    scores: { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q9a: false, q9b: false },
};

function candidate(studentId: string, overrides: Partial<StoredImportStudent> = {}): StoredImportStudent {
    return {
        id: `db-${studentId}`,
        studentId,
        nationalId: null,
        firstName: "สมชาย",
        lastName: "ใจดี",
        class: "ม.1/1",
        gender: "MALE",
        age: 13,
        phqResults: [],
        ...overrides,
    };
}

describe("zeroKey", () => {
    it.each([
        ["00123", "123"],
        ["123", "123"],
        ["000", "0"],
        ["0", "0"],
        ["1200", "1200"],
    ])("maps %s to %s", (input, expected) => {
        expect(zeroKey(input)).toBe(expected);
    });
});

describe("resolveNumericStudentIdentity", () => {
    it("is unmatched when no candidate shares the key", () => {
        expect(resolveNumericStudentIdentity(row, [], undefined)).toEqual({ kind: "unmatched" });
    });

    it("prefers national-ID evidence over a name mismatch", () => {
        const stored = candidate("00123", { nationalId: "1103700000011", firstName: "อื่น" });

        expect(resolveNumericStudentIdentity({ ...row, nationalId: "1103700000011" }, [stored], { id: stored.id }))
            .toEqual({ kind: "matched", student: stored });
    });

    it("does not fall back to names when both national IDs are present and differ", () => {
        const stored = candidate("00123", { nationalId: "1103700000012" });

        const result = resolveNumericStudentIdentity({ ...row, nationalId: "1103700000011" }, [stored], undefined);

        expect(result).toEqual({
            kind: "review",
            candidates: [stored],
            reason: "เลขบัตรประชาชนของรหัสนักเรียน 123 ไม่ตรงกับนักเรียนรหัส 00123 ในระบบ กรุณาตรวจรหัสนักเรียนและเลขบัตรประชาชนจากทะเบียนก่อนนำเข้า",
        });
        expect(result.kind === "review" && result.reason).not.toContain("ให้แก้รหัสในไฟล์เป็น");
    });

    it("leaves a different national-ID owner to the existing conflict rule", () => {
        expect(resolveNumericStudentIdentity({ ...row, nationalId: "1103700000011" }, [candidate("00123")], { id: "other" }))
            .toEqual({ kind: "unmatched" });
    });
});

describe("in-batch zero-key conflicts", () => {
    it("flags only numeric rows whose key matches a different all-digit text code", () => {
        const index = indexTextIdsByZeroKey([
            { ...row, studentId: "00123", numericStudentId: undefined },
            { ...row, studentId: "A123", numericStudentId: undefined },
            row,
        ]);

        expect(findInBatchZeroKeyConflicts(row, index)).toEqual(["00123"]);
        expect(findInBatchZeroKeyConflicts({ ...row, numericStudentId: undefined }, index)).toEqual([]);
    });
});

describe("parseImportStudentsOptions", () => {
    it.each([
        [undefined, { numericIdAcknowledged: false }],
        [{}, { numericIdAcknowledged: false }],
        [{ numericIdAcknowledged: true }, { numericIdAcknowledged: true }],
        [{ numericIdAcknowledged: false }, { numericIdAcknowledged: false }],
    ])("accepts %j", (input, expected) => {
        expect(parseImportStudentsOptions(input)).toEqual(expected);
    });

    it.each([null, [], "true", { numericIdAcknowledged: 1 }, { other: true }])("rejects %j", (input) => {
        expect(parseImportStudentsOptions(input)).toBeNull();
    });
});
