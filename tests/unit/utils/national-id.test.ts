import { describe, expect, it } from "vitest";
import {
    isValidNationalId,
    maskNationalId,
    normalizeNationalId,
    normalizeNationalIdInput,
    normalizeOptionalNationalId,
} from "@/lib/utils/national-id";

describe("national ID utility", () => {
    it.each([
        ["1234567890123", "1234567890123"],
        ["G1234567890123", "G1234567890123"],
        ["g1234567890123", "G1234567890123"],
        ["G123-4567-89012-3", "G1234567890123"],
        ["123-4567-89012-3", "1234567890123"],
        [" G123 4567 89012 3 ", "G1234567890123"],
    ])("normalizes %s", (input, expected) => {
        expect(normalizeNationalId(input)).toBe(expected);
    });

    it.each(["1234567890123", "G1234567890123"])(
        "accepts %s",
        (nationalId) => {
            expect(isValidNationalId(nationalId)).toBe(true);
        },
    );

    it.each([
        "A1234567890123",
        "G123456789012",
        "123G4567890123",
        "GG1234567890123",
    ])("rejects %s", (nationalId) => {
        expect(isValidNationalId(nationalId)).toBe(false);
    });

    it("normalizes optional blank values to null", () => {
        expect(normalizeOptionalNationalId(null)).toBeNull();
        expect(normalizeOptionalNationalId(undefined)).toBeNull();
        expect(normalizeOptionalNationalId(" - ")).toBeNull();
    });

    it("accepts only valid partial UI input", () => {
        expect(normalizeNationalIdInput("g123-45 6")).toBe("G123456");
        expect(normalizeNationalIdInput("A123")).toBeNull();
        expect(normalizeNationalIdInput("123G4")).toBeNull();
        expect(normalizeNationalIdInput("GG123")).toBeNull();
    });

    it("masks both supported forms without removing the prefix", () => {
        expect(maskNationalId("1234567890123")).toBe("*********0123");
        expect(maskNationalId("G1234567890123")).toBe("G*********0123");
        expect(maskNationalId(null)).toBeNull();
    });
});
