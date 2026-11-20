import { describe, expect, it } from "vitest";
import { studentIdentifierUpdateSchema, studentProfileUpdateSchema } from "@/lib/validations/student-profile.validation";

function validStudentProfile(overrides: Record<string, unknown> = {}) {
    return {
        studentId: "ST-001",
        firstName: "สมชาย",
        lastName: "ใจดี",
        gender: "MALE",
        age: 13,
        class: "ม.1/1",
        status: "ACTIVE",
        ...overrides,
    };
}

describe("studentProfileUpdateSchema", () => {
    it("accepts valid student profile data", () => {
        const result = studentProfileUpdateSchema.safeParse(
            validStudentProfile(),
        );

        expect(result.success).toBe(true);
    });

    it("rejects PHQ-A score fields", () => {
        const result = studentProfileUpdateSchema.safeParse(
            validStudentProfile({
                q1: 3,
                totalScore: 27,
                riskLevel: "red",
            }),
        );

        expect(result.success).toBe(false);
    });

    it("rejects invalid student status", () => {
        const result = studentProfileUpdateSchema.safeParse(
            validStudentProfile({ status: "SUSPENDED" }),
        );

        expect(result.success).toBe(false);
    });

    it.each([null, "", "G1234567890123"])("rejects any national ID from general profile edits", (nationalId) => {
        const result = studentProfileUpdateSchema.safeParse(
            validStudentProfile({ nationalId }),
        );

        expect(result.success).toBe(false);
    });

    it("allows nullable optional demographics", () => {
        expect(studentProfileUpdateSchema.safeParse(validStudentProfile({ gender: null, age: null })).success).toBe(true);
    });

    it("rejects invalid gender", () => {
        expect(studentProfileUpdateSchema.safeParse(validStudentProfile({ gender: "OTHER" })).success).toBe(false);
    });
});

describe("studentIdentifierUpdateSchema", () => {
    const expectedUpdatedAt = "2026-08-01T00:00:00.000Z";
    const reason = "ได้รับเลขประจำตัวอย่างเป็นทางการ";

    it.each([
        ["G1234567890123", "G1234567890123"],
        ["g1234567890123", "G1234567890123"],
        ["G123-4567-89012-3", "G1234567890123"],
    ])("accepts and normalizes national ID %s", (nationalId, expected) => {
        const result = studentIdentifierUpdateSchema.safeParse({ nationalId, expectedUpdatedAt, reason });

        expect(result.success).toBe(true);
        if (result.success) expect(result.data.nationalId).toBe(expected);
    });

    it.each([
        "A1234567890123",
        "G123456789012",
        "123G4567890123",
        "GG1234567890123",
        "12345",
        "",
    ])("rejects unsupported national ID %s", (nationalId) => {
        const result = studentIdentifierUpdateSchema.safeParse({ nationalId, expectedUpdatedAt, reason });

        expect(result.success).toBe(false);
    });

    it("accepts only explicit null to clear a stored identifier", () => {
        expect(studentIdentifierUpdateSchema.parse({ nationalId: null, expectedUpdatedAt, reason }).nationalId).toBeNull();
        expect(studentIdentifierUpdateSchema.safeParse({ expectedUpdatedAt, reason }).success).toBe(false);
    });

    it.each([undefined, "  ", "AB", "a".repeat(1001), "เลขเดิม (G123 - 4567 - 89012 - 3)", "เลข １２３４５６７８９０１２３"])(
        "rejects invalid or identifier-bearing reasons", (invalidReason) => {
            expect(studentIdentifierUpdateSchema.safeParse({ nationalId: null, expectedUpdatedAt, reason: invalidReason }).success).toBe(false);
        },
    );
});
