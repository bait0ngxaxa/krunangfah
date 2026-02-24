import { describe, it, expect } from "vitest";
import {
    createHomeVisitSchema,
    deleteHomeVisitSchema,
} from "@/lib/validations/home-visit.validation";

describe("createHomeVisitSchema", () => {
    function validInput(overrides: Record<string, unknown> = {}) {
        return {
            studentId: "cmlxdhmsq003dm6to89zm40sp", // valid CUID
            visitDate: "2026-02-24",
            description: "เยี่ยมบ้านนักเรียนเรียบร้อย",
            ...overrides,
        };
    }

    it("should accept valid input", () => {
        const result = createHomeVisitSchema.safeParse(validInput());
        expect(result.success).toBe(true);
    });

    it("should coerce string date to Date object", () => {
        const result = createHomeVisitSchema.safeParse(validInput());
        if (result.success) {
            expect(result.data.visitDate).toBeInstanceOf(Date);
        }
    });

    it("should accept optional nextScheduledDate", () => {
        const result = createHomeVisitSchema.safeParse(
            validInput({ nextScheduledDate: "2026-03-15" }),
        );
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.nextScheduledDate).toBeInstanceOf(Date);
        }
    });

    it("should accept missing nextScheduledDate (optional)", () => {
        const data = validInput();
        const result = createHomeVisitSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.nextScheduledDate).toBeUndefined();
        }
    });

    // ─── Invalid inputs ───

    it("should reject invalid studentId (not CUID)", () => {
        const result = createHomeVisitSchema.safeParse(
            validInput({ studentId: "not-a-cuid" }),
        );
        expect(result.success).toBe(false);
    });

    it("should reject empty studentId", () => {
        const result = createHomeVisitSchema.safeParse(
            validInput({ studentId: "" }),
        );
        expect(result.success).toBe(false);
    });

    it("should reject empty description", () => {
        const result = createHomeVisitSchema.safeParse(
            validInput({ description: "" }),
        );
        expect(result.success).toBe(false);
    });

    it("should reject invalid date string", () => {
        const result = createHomeVisitSchema.safeParse(
            validInput({ visitDate: "not-a-date" }),
        );
        expect(result.success).toBe(false);
    });
});

describe("deleteHomeVisitSchema", () => {
    it("should accept valid CUID visitId", () => {
        const result = deleteHomeVisitSchema.safeParse({
            visitId: "cmlxdhmsq003dm6to89zm40sp",
        });
        expect(result.success).toBe(true);
    });

    it("should reject invalid visitId", () => {
        const result = deleteHomeVisitSchema.safeParse({
            visitId: "not-a-cuid",
        });
        expect(result.success).toBe(false);
    });

    it("should reject empty visitId", () => {
        const result = deleteHomeVisitSchema.safeParse({ visitId: "" });
        expect(result.success).toBe(false);
    });
});
