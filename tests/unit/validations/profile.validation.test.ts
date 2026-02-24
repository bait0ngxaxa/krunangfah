import { describe, it, expect } from "vitest";
import {
    profileUpdateSchema,
    passwordChangeSchema,
} from "@/lib/validations/profile.validation";

// ─── profileUpdateSchema ───

describe("profileUpdateSchema", () => {
    function validProfile(overrides: Record<string, unknown> = {}) {
        return {
            firstName: "สมชาย",
            lastName: "ใจดี",
            age: 30,
            advisoryClass: "ม.1/1",
            academicYearId: "cuid_123456",
            schoolRole: "หัวหน้าระดับชั้น",
            projectRole: "lead",
            ...overrides,
        };
    }

    it("should accept valid profile data", () => {
        const result = profileUpdateSchema.safeParse(validProfile());
        expect(result.success).toBe(true);
    });

    it("should reject empty firstName", () => {
        const result = profileUpdateSchema.safeParse(
            validProfile({ firstName: "" }),
        );
        expect(result.success).toBe(false);
    });

    it("should reject empty lastName", () => {
        const result = profileUpdateSchema.safeParse(
            validProfile({ lastName: "" }),
        );
        expect(result.success).toBe(false);
    });

    it("should reject age 17 (below 18)", () => {
        const result = profileUpdateSchema.safeParse(validProfile({ age: 17 }));
        expect(result.success).toBe(false);
    });

    it("should accept age 18 (boundary)", () => {
        const result = profileUpdateSchema.safeParse(validProfile({ age: 18 }));
        expect(result.success).toBe(true);
    });

    it("should reject age 101 (above 100)", () => {
        const result = profileUpdateSchema.safeParse(
            validProfile({ age: 101 }),
        );
        expect(result.success).toBe(false);
    });

    it("should reject invalid projectRole", () => {
        const result = profileUpdateSchema.safeParse(
            validProfile({ projectRole: "boss" }),
        );
        expect(result.success).toBe(false);
    });

    it("should accept all valid project roles", () => {
        for (const role of ["lead", "care", "coordinate"]) {
            const result = profileUpdateSchema.safeParse(
                validProfile({ projectRole: role }),
            );
            expect(result.success).toBe(true);
        }
    });
});

// ─── passwordChangeSchema ───

describe("passwordChangeSchema", () => {
    function validPasswordChange(overrides: Record<string, unknown> = {}) {
        return {
            currentPassword: "oldpass123",
            newPassword: "newpass456",
            confirmPassword: "newpass456",
            ...overrides,
        };
    }

    it("should accept valid password change", () => {
        const result = passwordChangeSchema.safeParse(validPasswordChange());
        expect(result.success).toBe(true);
    });

    it("should reject empty currentPassword", () => {
        const result = passwordChangeSchema.safeParse(
            validPasswordChange({ currentPassword: "" }),
        );
        expect(result.success).toBe(false);
    });

    it("should reject newPassword shorter than 6 characters", () => {
        const result = passwordChangeSchema.safeParse(
            validPasswordChange({
                newPassword: "12345",
                confirmPassword: "12345",
            }),
        );
        expect(result.success).toBe(false);
    });

    it("should accept newPassword with exactly 6 characters", () => {
        const result = passwordChangeSchema.safeParse(
            validPasswordChange({
                newPassword: "123456",
                confirmPassword: "123456",
            }),
        );
        expect(result.success).toBe(true);
    });

    it("should reject when confirmPassword does not match newPassword", () => {
        const result = passwordChangeSchema.safeParse(
            validPasswordChange({ confirmPassword: "different" }),
        );
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((i) => i.path.join("."));
            expect(paths).toContain("confirmPassword");
        }
    });

    it("should reject when newPassword is the same as currentPassword", () => {
        const result = passwordChangeSchema.safeParse(
            validPasswordChange({
                currentPassword: "samepass123",
                newPassword: "samepass123",
                confirmPassword: "samepass123",
            }),
        );
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((i) => i.path.join("."));
            expect(paths).toContain("newPassword");
        }
    });

    it("should reject when both refine rules fail (mismatch AND reuse)", () => {
        // newPassword = currentPassword, confirmPassword ≠ newPassword
        const result = passwordChangeSchema.safeParse(
            validPasswordChange({
                currentPassword: "samepass123",
                newPassword: "samepass123",
                confirmPassword: "notmatching",
            }),
        );
        expect(result.success).toBe(false);
    });
});
