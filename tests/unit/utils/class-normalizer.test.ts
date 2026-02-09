import { describe, it, expect } from "vitest";
import {
    normalizeClassName,
    isValidClassName,
    extractGradeLevel,
    extractRoomNumber,
} from "@/lib/utils/class-normalizer";

describe("normalizeClassName", () => {
    describe("Valid Thai formats (ม.)", () => {
        it('should normalize "ม. 2/5" to "ม.2/5"', () => {
            expect(normalizeClassName("ม. 2/5")).toBe("ม.2/5");
        });

        it('should normalize "ม 2/5" to "ม.2/5"', () => {
            expect(normalizeClassName("ม 2/5")).toBe("ม.2/5");
        });

        it('should keep "ม.2/5" as is', () => {
            expect(normalizeClassName("ม.2/5")).toBe("ม.2/5");
        });

        it('should normalize "ม2/5" to "ม.2/5"', () => {
            expect(normalizeClassName("ม2/5")).toBe("ม.2/5");
        });
    });

    describe("English to Thai conversion (m → ม)", () => {
        it('should convert "m.2/5" to "ม.2/5"', () => {
            expect(normalizeClassName("m.2/5")).toBe("ม.2/5");
        });

        it('should convert "M.2/5" to "ม.2/5"', () => {
            expect(normalizeClassName("M.2/5")).toBe("ม.2/5");
        });

        it('should convert "M2/5" to "ม.2/5"', () => {
            expect(normalizeClassName("M2/5")).toBe("ม.2/5");
        });

        it('should convert "m 2/5" to "ม.2/5"', () => {
            expect(normalizeClassName("m 2/5")).toBe("ม.2/5");
        });
    });

    describe("Primary school formats (ป.)", () => {
        it('should normalize "ป.6/1" correctly', () => {
            expect(normalizeClassName("ป.6/1")).toBe("ป.6/1");
        });

        it('should normalize "ป 6/1" to "ป.6/1"', () => {
            expect(normalizeClassName("ป 6/1")).toBe("ป.6/1");
        });

        it('should convert "p.6/1" to "ป.6/1"', () => {
            expect(normalizeClassName("p.6/1")).toBe("ป.6/1");
        });

        it('should convert "P6/1" to "ป.6/1"', () => {
            expect(normalizeClassName("P6/1")).toBe("ป.6/1");
        });
    });

    describe("Whitespace handling", () => {
        it("should remove extra spaces", () => {
            expect(normalizeClassName("ม.  2  /  5")).toBe("ม.2/5");
        });

        it("should trim leading and trailing spaces", () => {
            expect(normalizeClassName("  ม.2/5  ")).toBe("ม.2/5");
        });
    });

    describe("Edge cases", () => {
        it("should return empty string for empty input", () => {
            expect(normalizeClassName("")).toBe("");
        });

        it('should keep numeric-only format "2/5" as is', () => {
            expect(normalizeClassName("2/5")).toBe("2/5");
        });

        it("should handle single-digit room numbers", () => {
            expect(normalizeClassName("ม.1/1")).toBe("ม.1/1");
        });

        it("should handle double-digit room numbers", () => {
            expect(normalizeClassName("ม.3/12")).toBe("ม.3/12");
        });
    });
});

describe("isValidClassName", () => {
    describe("Valid formats", () => {
        it('should accept "ม.1/1"', () => {
            expect(isValidClassName("ม.1/1")).toBe(true);
        });

        it('should accept "ม.6/99"', () => {
            expect(isValidClassName("ม.6/99")).toBe(true);
        });

        it('should accept "ป.1/1"', () => {
            expect(isValidClassName("ป.1/1")).toBe(true);
        });

        it('should accept "ป.6/10"', () => {
            expect(isValidClassName("ป.6/10")).toBe(true);
        });

        it('should accept numeric format "1/1"', () => {
            expect(isValidClassName("1/1")).toBe(true);
        });

        it('should accept numeric format "12/5"', () => {
            expect(isValidClassName("12/5")).toBe(true);
        });

        it('should accept "m.2/5" (after normalization)', () => {
            expect(isValidClassName("m.2/5")).toBe(true);
        });
    });

    describe("Invalid formats", () => {
        it("should reject empty string", () => {
            expect(isValidClassName("")).toBe(false);
        });

        it('should reject "ม.7/1" (grade > 6)', () => {
            expect(isValidClassName("ม.7/1")).toBe(false);
        });

        it('should reject "ม.0/1" (grade < 1)', () => {
            expect(isValidClassName("ม.0/1")).toBe(false);
        });

        it('should reject "ม.2" (missing room)', () => {
            expect(isValidClassName("ม.2")).toBe(false);
        });

        it('should reject "2" (missing room)', () => {
            expect(isValidClassName("2")).toBe(false);
        });

        it('should reject "abc/5" (invalid prefix)', () => {
            expect(isValidClassName("abc/5")).toBe(false);
        });
    });
});

describe("extractGradeLevel", () => {
    it('should extract "ม.2" from "ม.2/5"', () => {
        expect(extractGradeLevel("ม.2/5")).toBe("ม.2");
    });

    it('should extract "ม.1" from "ม.1/10"', () => {
        expect(extractGradeLevel("ม.1/10")).toBe("ม.1");
    });

    it('should extract "ป.6" from "ป.6/1"', () => {
        expect(extractGradeLevel("ป.6/1")).toBe("ป.6");
    });

    it('should extract "2" from "2/5"', () => {
        expect(extractGradeLevel("2/5")).toBe("2");
    });

    it('should extract "12" from "12/5"', () => {
        expect(extractGradeLevel("12/5")).toBe("12");
    });

    it('should handle "m.2/5" (after normalization)', () => {
        expect(extractGradeLevel("m.2/5")).toBe("ม.2");
    });

    it("should return empty string for invalid format", () => {
        expect(extractGradeLevel("invalid")).toBe("");
    });
});

describe("extractRoomNumber", () => {
    it('should extract "5" from "ม.2/5"', () => {
        expect(extractRoomNumber("ม.2/5")).toBe("5");
    });

    it('should extract "10" from "ม.1/10"', () => {
        expect(extractRoomNumber("ม.1/10")).toBe("10");
    });

    it('should extract "1" from "ป.6/1"', () => {
        expect(extractRoomNumber("ป.6/1")).toBe("1");
    });

    it('should extract "5" from "2/5"', () => {
        expect(extractRoomNumber("2/5")).toBe("5");
    });

    it('should handle "m.2/12" (after normalization)', () => {
        expect(extractRoomNumber("m.2/12")).toBe("12");
    });

    it("should return empty string for format without slash", () => {
        expect(extractRoomNumber("ม.2")).toBe("");
    });

    it("should return empty string for invalid format", () => {
        expect(extractRoomNumber("invalid")).toBe("");
    });
});
