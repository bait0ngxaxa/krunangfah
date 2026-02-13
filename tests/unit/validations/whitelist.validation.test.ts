import { describe, it, expect } from "vitest";
import {
    whitelistEmailSchema,
    type WhitelistFormData,
} from "@/lib/validations/whitelist.validation";

describe("whitelistEmailSchema", () => {
    describe("Valid inputs", () => {
        it("should accept valid email", () => {
            const data = { email: "teacher@school.ac.th" };
            const result = whitelistEmailSchema.safeParse(data);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.email).toBe("teacher@school.ac.th");
            }
        });

        it("should accept email with subdomain", () => {
            const data = { email: "user@mail.example.com" };
            const result = whitelistEmailSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });

    describe("Transform: lowercase", () => {
        it("should transform uppercase email to lowercase", () => {
            const data = { email: "Teacher@School.AC.TH" };
            const result = whitelistEmailSchema.safeParse(data);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.email).toBe("teacher@school.ac.th");
            }
        });

        it("should transform mixed case email to lowercase", () => {
            const data = { email: "Test.User@Example.COM" };
            const result = whitelistEmailSchema.safeParse(data);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.email).toBe("test.user@example.com");
            }
        });
    });

    describe("Whitespace handling", () => {
        /**
         * Note: Zod validates .email() BEFORE .transform() runs,
         * so emails with leading/trailing spaces fail email validation.
         * The transform (lowercase+trim) only applies to already-valid emails.
         */
        it("should reject email with leading spaces (fails email validation before transform)", () => {
            const data = { email: "  user@example.com" };
            const result = whitelistEmailSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it("should reject email with trailing spaces (fails email validation before transform)", () => {
            const data = { email: "user@example.com  " };
            const result = whitelistEmailSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it("should reject email with both leading and trailing spaces", () => {
            const data = { email: "  user@example.com  " };
            const result = whitelistEmailSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe("Invalid email", () => {
        it("should reject empty email", () => {
            const data = { email: "" };
            const result = whitelistEmailSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe("กรุณากรอกอีเมล");
            }
        });

        it("should reject invalid email format", () => {
            const data = { email: "not-an-email" };
            const result = whitelistEmailSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "รูปแบบอีเมลไม่ถูกต้อง",
                );
            }
        });

        it("should reject email without @", () => {
            const data = { email: "userexample.com" };
            const result = whitelistEmailSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it("should reject email without domain", () => {
            const data = { email: "user@" };
            const result = whitelistEmailSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe("Missing fields", () => {
        it("should reject empty object", () => {
            const result = whitelistEmailSchema.safeParse({});
            expect(result.success).toBe(false);
        });

        it("should reject missing email field", () => {
            const data = {} as WhitelistFormData;
            const result = whitelistEmailSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });
});
