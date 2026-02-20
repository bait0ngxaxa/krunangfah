import { describe, it, expect } from "vitest";
import type { ZodIssue } from "zod";
import {
    signInSchema,
    inviteRegisterSchema,
    type SignInFormData,
    type InviteRegisterFormData,
} from "@/lib/validations/auth.validation";

describe("signInSchema", () => {
    describe("Valid inputs", () => {
        it("should accept valid email and password", () => {
            const data = {
                email: "test@example.com",
                password: "password123",
            };
            const result = signInSchema.safeParse(data);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual(data);
            }
        });

        it("should accept any non-empty password", () => {
            const data = {
                email: "user@test.com",
                password: "a",
            };
            const result = signInSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });

    describe("Invalid email", () => {
        it("should reject invalid email format", () => {
            const data = {
                email: "not-an-email",
                password: "password123",
            };
            const result = signInSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe("อีเมลไม่ถูกต้อง");
            }
        });

        it("should reject email without @", () => {
            const data = {
                email: "testexample.com",
                password: "password123",
            };
            const result = signInSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it("should reject email without domain", () => {
            const data = {
                email: "test@",
                password: "password123",
            };
            const result = signInSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it("should reject empty email", () => {
            const data = {
                email: "",
                password: "password123",
            };
            const result = signInSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe("Invalid password", () => {
        it("should reject empty password", () => {
            const data = {
                email: "test@example.com",
                password: "",
            };
            const result = signInSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "กรุณากรอกรหัสผ่าน",
                );
            }
        });
    });

    describe("Missing fields", () => {
        it("should reject missing email", () => {
            const data = {
                password: "password123",
            } as SignInFormData;
            const result = signInSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it("should reject missing password", () => {
            const data = {
                email: "test@example.com",
            } as SignInFormData;
            const result = signInSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });
});

describe("inviteRegisterSchema", () => {
    describe("Valid inputs", () => {
        it("should accept valid password and matching confirmPassword", () => {
            const data = {
                password: "password123",
                confirmPassword: "password123",
            };
            const result = inviteRegisterSchema.safeParse(data);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual(data);
            }
        });

        it("should accept password with exactly 6 characters", () => {
            const data = {
                password: "123456",
                confirmPassword: "123456",
            };
            const result = inviteRegisterSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it("should accept long passwords", () => {
            const data = {
                password: "verylongpassword123456789",
                confirmPassword: "verylongpassword123456789",
            };
            const result = inviteRegisterSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });

    describe("Invalid password", () => {
        it("should reject password shorter than 6 characters", () => {
            const data = {
                password: "12345",
                confirmPassword: "12345",
            };
            const result = inviteRegisterSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
                );
            }
        });

        it("should reject empty password", () => {
            const data = {
                password: "",
                confirmPassword: "",
            };
            const result = inviteRegisterSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe("Password mismatch", () => {
        it("should reject when passwords don't match", () => {
            const data = {
                password: "password123",
                confirmPassword: "password456",
            };
            const result = inviteRegisterSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                const confirmPasswordError = result.error.issues.find(
                    (issue: ZodIssue) => issue.path[0] === "confirmPassword",
                );
                expect(confirmPasswordError?.message).toBe("รหัสผ่านไม่ตรงกัน");
            }
        });

        it("should reject when confirmPassword is empty but password is not", () => {
            const data = {
                password: "password123",
                confirmPassword: "",
            };
            const result = inviteRegisterSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe("Missing fields", () => {
        it("should reject missing password", () => {
            const data = {
                confirmPassword: "password123",
            } as InviteRegisterFormData;
            const result = inviteRegisterSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it("should reject missing confirmPassword", () => {
            const data = {
                password: "password123",
            } as InviteRegisterFormData;
            const result = inviteRegisterSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });
});
