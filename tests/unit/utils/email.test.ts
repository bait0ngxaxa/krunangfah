import { describe, expect, it } from "vitest";
import { normalizeEmail } from "@/lib/utils/email";

describe("normalizeEmail", () => {
    it("trims surrounding whitespace and lowercases the email", () => {
        expect(normalizeEmail("  Teacher@School.ac.th ")).toBe(
            "teacher@school.ac.th",
        );
    });

    it("is idempotent for an already normalized email", () => {
        expect(normalizeEmail("teacher@school.ac.th")).toBe(
            "teacher@school.ac.th",
        );
    });
});
