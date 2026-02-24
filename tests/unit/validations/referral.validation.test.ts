import { describe, it, expect } from "vitest";
import {
    createReferralSchema,
    revokeReferralSchema,
} from "@/lib/validations/referral.validation";

describe("createReferralSchema", () => {
    const validCuid = "cmlxdhmsq003dm6to89zm40sp";

    it("should accept valid CUID for both fields", () => {
        const result = createReferralSchema.safeParse({
            studentId: validCuid,
            toTeacherUserId: validCuid,
        });
        expect(result.success).toBe(true);
    });

    it("should reject invalid studentId", () => {
        const result = createReferralSchema.safeParse({
            studentId: "not-a-cuid",
            toTeacherUserId: validCuid,
        });
        expect(result.success).toBe(false);
    });

    it("should reject invalid toTeacherUserId", () => {
        const result = createReferralSchema.safeParse({
            studentId: validCuid,
            toTeacherUserId: "abc123",
        });
        expect(result.success).toBe(false);
    });

    it("should reject empty studentId", () => {
        const result = createReferralSchema.safeParse({
            studentId: "",
            toTeacherUserId: validCuid,
        });
        expect(result.success).toBe(false);
    });

    it("should reject missing fields", () => {
        const result = createReferralSchema.safeParse({});
        expect(result.success).toBe(false);
    });
});

describe("revokeReferralSchema", () => {
    const validCuid = "cmlxdhmsq003dm6to89zm40sp";

    it("should accept valid CUID referralId", () => {
        const result = revokeReferralSchema.safeParse({
            referralId: validCuid,
        });
        expect(result.success).toBe(true);
    });

    it("should reject invalid referralId", () => {
        const result = revokeReferralSchema.safeParse({
            referralId: "not-a-cuid",
        });
        expect(result.success).toBe(false);
    });

    it("should reject empty referralId", () => {
        const result = revokeReferralSchema.safeParse({ referralId: "" });
        expect(result.success).toBe(false);
    });

    it("should reject missing referralId", () => {
        const result = revokeReferralSchema.safeParse({});
        expect(result.success).toBe(false);
    });
});
