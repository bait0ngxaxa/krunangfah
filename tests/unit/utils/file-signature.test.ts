import { describe, it, expect } from "vitest";
import { validateFileSignature } from "@/lib/utils/file-signature";

/**
 * Helper: create a Buffer from hex bytes
 */
function hexBuf(...bytes: number[]): Buffer {
    return Buffer.from(bytes);
}

// Known magic byte signatures
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const XLSX_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // ZIP/PK
const XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // OLE2

describe("validateFileSignature", () => {
    // ─── Empty / too-short buffers ───
    describe("empty and too-short buffers", () => {
        it("should reject an empty buffer", () => {
            expect(validateFileSignature(Buffer.alloc(0), "jpg")).toBe(false);
        });

        it("should reject a 1-byte buffer for JPEG (needs 3 bytes)", () => {
            expect(validateFileSignature(hexBuf(0xff), "jpg")).toBe(false);
        });

        it("should reject a 2-byte buffer for JPEG (needs 3 bytes)", () => {
            expect(validateFileSignature(hexBuf(0xff, 0xd8), "jpg")).toBe(
                false,
            );
        });

        it("should reject a 3-byte buffer for PNG (needs 8 bytes)", () => {
            expect(validateFileSignature(hexBuf(0x89, 0x50, 0x4e), "png")).toBe(
                false,
            );
        });
    });

    // ─── Valid signatures ───
    describe("valid file signatures", () => {
        it("should accept valid JPEG (jpg)", () => {
            const buf = hexBuf(...JPEG_MAGIC, 0x00, 0x00);
            expect(validateFileSignature(buf, "jpg")).toBe(true);
        });

        it("should accept valid JPEG (jpeg)", () => {
            const buf = hexBuf(...JPEG_MAGIC, 0x00, 0x00);
            expect(validateFileSignature(buf, "jpeg")).toBe(true);
        });

        it("should accept valid PNG", () => {
            const buf = hexBuf(...PNG_MAGIC, 0x00, 0x00);
            expect(validateFileSignature(buf, "png")).toBe(true);
        });

        it("should accept valid PDF", () => {
            const buf = hexBuf(...PDF_MAGIC, 0x2d, 0x31); // %PDF-1
            expect(validateFileSignature(buf, "pdf")).toBe(true);
        });

        it("should accept valid XLSX", () => {
            const buf = hexBuf(...XLSX_MAGIC, 0x00, 0x00);
            expect(validateFileSignature(buf, "xlsx")).toBe(true);
        });

        it("should accept valid XLS", () => {
            const buf = hexBuf(...XLS_MAGIC, 0x00, 0x00);
            expect(validateFileSignature(buf, "xls")).toBe(true);
        });

        it("should accept JPEG with exact minimum bytes (3 bytes)", () => {
            expect(validateFileSignature(hexBuf(...JPEG_MAGIC), "jpg")).toBe(
                true,
            );
        });
    });

    // ─── Extension spoofing (wrong magic bytes) ───
    describe("extension spoofing attacks", () => {
        it("should reject EXE bytes disguised as .jpg", () => {
            // MZ header (EXE)
            const buf = hexBuf(0x4d, 0x5a, 0x90, 0x00);
            expect(validateFileSignature(buf, "jpg")).toBe(false);
        });

        it("should reject PNG bytes disguised as .pdf", () => {
            const buf = hexBuf(...PNG_MAGIC);
            expect(validateFileSignature(buf, "pdf")).toBe(false);
        });

        it("should reject JPEG bytes disguised as .png", () => {
            const buf = hexBuf(...JPEG_MAGIC, 0x00, 0x00, 0x00, 0x00, 0x00);
            expect(validateFileSignature(buf, "png")).toBe(false);
        });

        it("should reject PDF bytes disguised as .xlsx", () => {
            const buf = hexBuf(...PDF_MAGIC, 0x00, 0x00);
            expect(validateFileSignature(buf, "xlsx")).toBe(false);
        });

        it("should reject random bytes for any extension", () => {
            const randomBuf = hexBuf(
                0x01,
                0x02,
                0x03,
                0x04,
                0x05,
                0x06,
                0x07,
                0x08,
            );
            expect(validateFileSignature(randomBuf, "jpg")).toBe(false);
            expect(validateFileSignature(randomBuf, "png")).toBe(false);
            expect(validateFileSignature(randomBuf, "pdf")).toBe(false);
            expect(validateFileSignature(randomBuf, "xlsx")).toBe(false);
            expect(validateFileSignature(randomBuf, "xls")).toBe(false);
        });
    });

    // ─── Unknown extensions ───
    describe("unknown extensions", () => {
        it("should reject unknown extension (.bat)", () => {
            const buf = hexBuf(...JPEG_MAGIC, 0x00, 0x00);
            expect(validateFileSignature(buf, "bat")).toBe(false);
        });

        it("should reject unknown extension (.exe)", () => {
            const buf = hexBuf(0x4d, 0x5a, 0x90, 0x00);
            expect(validateFileSignature(buf, "exe")).toBe(false);
        });

        it("should reject empty extension", () => {
            const buf = hexBuf(...JPEG_MAGIC);
            expect(validateFileSignature(buf, "")).toBe(false);
        });
    });
});
