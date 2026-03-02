import { describe, it, expect } from "vitest";
import {
    sanitizeText,
    sanitizeName,
    normalizeSchoolName,
} from "@/lib/utils/text-sanitizer";

describe("sanitizeText", () => {
    it("should return empty string for empty input", () => {
        expect(sanitizeText("")).toBe("");
    });

    it("should return empty string for falsy input", () => {
        expect(sanitizeText("")).toBe("");
    });

    it("should trim leading and trailing whitespace", () => {
        expect(sanitizeText("  hello  ")).toBe("hello");
    });

    it("should collapse multiple spaces into one", () => {
        expect(sanitizeText("hello   world")).toBe("hello world");
    });

    it("should remove zero-width characters (\\u200B)", () => {
        expect(sanitizeText("hello\u200Bworld")).toBe("helloworld");
    });

    it("should remove zero-width non-joiner (\\u200C)", () => {
        expect(sanitizeText("hello\u200Cworld")).toBe("helloworld");
    });

    it("should remove BOM character (\\uFEFF)", () => {
        expect(sanitizeText("\uFEFFhello")).toBe("hello");
    });

    it("should remove soft-hyphen (\\u00AD)", () => {
        expect(sanitizeText("hel\u00ADlo")).toBe("hello");
    });

    it("should keep normal Thai characters unchanged", () => {
        expect(sanitizeText("สวัสดี")).toBe("สวัสดี");
    });

    it("should handle combined whitespace and zero-width chars", () => {
        expect(sanitizeText("  \u200Bhello\u200B  world  ")).toBe(
            "hello world",
        );
    });
});

describe("sanitizeName", () => {
    it("should return empty string for empty input", () => {
        expect(sanitizeName("")).toBe("");
    });

    it("should keep Thai characters", () => {
        expect(sanitizeName("สมชาย")).toBe("สมชาย");
    });

    it("should keep Latin letters", () => {
        expect(sanitizeName("John Doe")).toBe("John Doe");
    });

    it("should keep spaces, dots, and hyphens", () => {
        expect(sanitizeName("Mary-Jane O'Brien")).toBe("Mary-Jane OBrien");
    });

    it("should keep dots in names", () => {
        expect(sanitizeName("Dr. Smith")).toBe("Dr. Smith");
    });

    it("should remove digits from names", () => {
        expect(sanitizeName("John123")).toBe("John");
    });

    it("should remove special characters like @, #, !", () => {
        expect(sanitizeName("John@#!")).toBe("John");
    });

    it("should trim result after removing illegal chars", () => {
        expect(sanitizeName("  สมชาย  123  ")).toBe("สมชาย");
    });

    it("should handle mixed Thai and English name", () => {
        expect(sanitizeName("สมชาย Johnson")).toBe("สมชาย Johnson");
    });
});

describe("normalizeSchoolName", () => {
    it("should return empty string for empty input", () => {
        expect(normalizeSchoolName("")).toBe("");
    });

    it("should prepend โรงเรียน if not present", () => {
        expect(normalizeSchoolName("วัดบวรนิเวศ")).toBe("โรงเรียนวัดบวรนิเวศ");
    });

    it("should not double-prepend if already starts with โรงเรียน", () => {
        expect(normalizeSchoolName("โรงเรียนวัดบวรนิเวศ")).toBe(
            "โรงเรียนวัดบวรนิเวศ",
        );
    });

    it("should replace ร.ร. abbreviation at start", () => {
        expect(normalizeSchoolName("ร.ร.วัดบวรนิเวศ")).toBe(
            "โรงเรียนวัดบวรนิเวศ",
        );
    });

    it("should replace รร. abbreviation at start", () => {
        expect(normalizeSchoolName("รร.วัดบวรนิเวศ")).toBe(
            "โรงเรียนวัดบวรนิเวศ",
        );
    });

    it("should trim whitespace before processing", () => {
        expect(normalizeSchoolName("  วัดบวรนิเวศ  ")).toBe(
            "โรงเรียนวัดบวรนิเวศ",
        );
    });

    it("should handle ร.ร with trailing space", () => {
        expect(normalizeSchoolName("ร.ร. วัดบวรนิเวศ")).toBe(
            "โรงเรียนวัดบวรนิเวศ",
        );
    });
});
