import { describe, it, expect } from "vitest";
import {
    updateHospitalReferralSchema,
    type UpdateHospitalReferralInput,
} from "@/lib/validations/hospital-referral.validation";

describe("updateHospitalReferralSchema", () => {
    describe("Valid inputs", () => {
        it("should accept referral with hospital name", () => {
            const data: UpdateHospitalReferralInput = {
                phqResultId: "clxyz123456789abcdef",
                referredToHospital: true,
                hospitalName: "โรงพยาบาลศิริราช",
            };
            const result = updateHospitalReferralSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it("should accept non-referral without hospital name", () => {
            const data = {
                phqResultId: "clxyz123456789abcdef",
                referredToHospital: false,
            };
            const result = updateHospitalReferralSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it("should accept non-referral with empty hospital name", () => {
            const data = {
                phqResultId: "clxyz123456789abcdef",
                referredToHospital: false,
                hospitalName: "",
            };
            const result = updateHospitalReferralSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it("should accept non-referral with hospital name provided", () => {
            const data = {
                phqResultId: "clxyz123456789abcdef",
                referredToHospital: false,
                hospitalName: "โรงพยาบาลรามา",
            };
            const result = updateHospitalReferralSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });

    describe("Refine logic: referredToHospital requires hospitalName", () => {
        it("should reject referral without hospital name", () => {
            const data = {
                phqResultId: "clxyz123456789abcdef",
                referredToHospital: true,
            };
            const result = updateHospitalReferralSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                const hospitalError = result.error.issues.find((issue) =>
                    issue.path.includes("hospitalName"),
                );
                expect(hospitalError?.message).toBe("กรุณาระบุชื่อโรงพยาบาล");
            }
        });

        it("should reject referral with empty hospital name", () => {
            const data = {
                phqResultId: "clxyz123456789abcdef",
                referredToHospital: true,
                hospitalName: "",
            };
            const result = updateHospitalReferralSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it("should reject referral with whitespace-only hospital name", () => {
            const data = {
                phqResultId: "clxyz123456789abcdef",
                referredToHospital: true,
                hospitalName: "   ",
            };
            const result = updateHospitalReferralSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                const hospitalError = result.error.issues.find((issue) =>
                    issue.path.includes("hospitalName"),
                );
                expect(hospitalError?.message).toBe("กรุณาระบุชื่อโรงพยาบาล");
            }
        });
    });

    describe("Invalid phqResultId", () => {
        it("should reject invalid CUID format", () => {
            const data = {
                phqResultId: "invalid-id",
                referredToHospital: false,
            };
            const result = updateHospitalReferralSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "Invalid PHQ result ID",
                );
            }
        });

        it("should reject empty phqResultId", () => {
            const data = {
                phqResultId: "",
                referredToHospital: false,
            };
            const result = updateHospitalReferralSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe("Invalid referredToHospital", () => {
        it("should reject non-boolean referredToHospital", () => {
            const data = {
                phqResultId: "clxyz123456789abcdef",
                referredToHospital: "yes",
            };
            const result = updateHospitalReferralSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it("should reject missing referredToHospital", () => {
            const data = {
                phqResultId: "clxyz123456789abcdef",
            } as UpdateHospitalReferralInput;
            const result = updateHospitalReferralSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe("hospitalName max length", () => {
        it("should accept hospital name at 200 characters", () => {
            const data = {
                phqResultId: "clxyz123456789abcdef",
                referredToHospital: true,
                hospitalName: "ก".repeat(200),
            };
            const result = updateHospitalReferralSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it("should reject hospital name over 200 characters", () => {
            const data = {
                phqResultId: "clxyz123456789abcdef",
                referredToHospital: true,
                hospitalName: "ก".repeat(201),
            };
            const result = updateHospitalReferralSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "ชื่อโรงพยาบาลต้องไม่เกิน 200 ตัวอักษร",
                );
            }
        });
    });

    describe("Missing fields", () => {
        it("should reject empty object", () => {
            const result = updateHospitalReferralSchema.safeParse({});
            expect(result.success).toBe(false);
        });
    });
});
