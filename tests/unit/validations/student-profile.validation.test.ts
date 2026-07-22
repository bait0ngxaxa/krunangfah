import { describe, expect, it } from "vitest";
import { studentProfileUpdateSchema } from "@/lib/validations/student-profile.validation";

function validStudentProfile(overrides: Record<string, unknown> = {}) {
    return {
        studentId: "ST-001",
        nationalId: "1103700000011",
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

    it("rejects invalid national ID", () => {
        const result = studentProfileUpdateSchema.safeParse(
            validStudentProfile({ nationalId: "12345" }),
        );

        expect(result.success).toBe(false);
    });

    it.each([
        ["G1234567890123", "G1234567890123"],
        ["g1234567890123", "G1234567890123"],
        ["G123-4567-89012-3", "G1234567890123"],
    ])("accepts and normalizes national ID %s", (nationalId, expected) => {
        const result = studentProfileUpdateSchema.safeParse(
            validStudentProfile({ nationalId }),
        );

        expect(result.success).toBe(true);
        if (result.success) expect(result.data.nationalId).toBe(expected);
    });

    it.each([
        "A1234567890123",
        "G123456789012",
        "123G4567890123",
        "GG1234567890123",
    ])("rejects unsupported national ID %s", (nationalId) => {
        const result = studentProfileUpdateSchema.safeParse(
            validStudentProfile({ nationalId }),
        );

        expect(result.success).toBe(false);
    });

    it("allows blank national ID for legacy records", () => {
        const result = studentProfileUpdateSchema.safeParse(
            validStudentProfile({ nationalId: "" }),
        );

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.nationalId).toBeNull();
        }
    });

    it("allows nullable optional demographics", () => {
        const result = studentProfileUpdateSchema.safeParse(
            validStudentProfile({
                gender: null,
                age: null,
            }),
        );

        expect(result.success).toBe(true);
    });

    it("rejects invalid gender", () => {
        const result = studentProfileUpdateSchema.safeParse(
            validStudentProfile({ gender: "OTHER" }),
        );

        expect(result.success).toBe(false);
    });
});
