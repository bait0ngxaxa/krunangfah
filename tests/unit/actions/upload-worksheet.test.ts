import { describe, it, expect } from "vitest";

// Import constants for testing
import {
    ALLOWED_FILE_TYPES,
    ALLOWED_EXTENSIONS,
    MAGIC_BYTES,
    MAX_FILE_SIZE,
    REQUIRED_WORKSHEETS,
} from "@/lib/actions/activity/constants";

describe("Upload Worksheet - File Type Validation", () => {
    describe("ALLOWED_FILE_TYPES", () => {
        it("should include JPEG format", () => {
            expect(ALLOWED_FILE_TYPES).toContain("image/jpeg");
        });

        it("should include PNG format", () => {
            expect(ALLOWED_FILE_TYPES).toContain("image/png");
        });

        it("should include PDF format", () => {
            expect(ALLOWED_FILE_TYPES).toContain("application/pdf");
        });

        it("should not include GIF format", () => {
            expect(ALLOWED_FILE_TYPES).not.toContain("image/gif");
        });

        it("should not include executable formats", () => {
            expect(ALLOWED_FILE_TYPES).not.toContain(
                "application/x-msdownload",
            );
            expect(ALLOWED_FILE_TYPES).not.toContain(
                "application/x-executable",
            );
        });
    });

    describe("ALLOWED_EXTENSIONS", () => {
        it("should allow jpg", () => {
            expect(ALLOWED_EXTENSIONS.has("jpg")).toBe(true);
        });

        it("should allow jpeg", () => {
            expect(ALLOWED_EXTENSIONS.has("jpeg")).toBe(true);
        });

        it("should allow png", () => {
            expect(ALLOWED_EXTENSIONS.has("png")).toBe(true);
        });

        it("should allow pdf", () => {
            expect(ALLOWED_EXTENSIONS.has("pdf")).toBe(true);
        });

        it("should not allow exe", () => {
            expect(ALLOWED_EXTENSIONS.has("exe")).toBe(false);
        });

        it("should not allow js", () => {
            expect(ALLOWED_EXTENSIONS.has("js")).toBe(false);
        });

        it("should not allow html", () => {
            expect(ALLOWED_EXTENSIONS.has("html")).toBe(false);
        });
    });
});

describe("Upload Worksheet - File Size Validation", () => {
    describe("MAX_FILE_SIZE", () => {
        it("should be 10MB", () => {
            expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
        });

        it("should reject files larger than 10MB", () => {
            const largeFileSize = 11 * 1024 * 1024;
            expect(largeFileSize > MAX_FILE_SIZE).toBe(true);
        });

        it("should accept files smaller than 10MB", () => {
            const smallFileSize = 5 * 1024 * 1024;
            expect(smallFileSize <= MAX_FILE_SIZE).toBe(true);
        });

        it("should accept files exactly 10MB", () => {
            const exactFileSize = 10 * 1024 * 1024;
            expect(exactFileSize <= MAX_FILE_SIZE).toBe(true);
        });
    });
});

describe("Upload Worksheet - Magic Bytes Validation", () => {
    /**
     * Validate file content by checking magic bytes (file signature)
     */
    const validateMagicBytes = (buffer: Buffer, mimeType: string): boolean => {
        const signature = MAGIC_BYTES.find((m) => m.mime === mimeType);
        if (!signature) {
            return false;
        }

        if (buffer.length < signature.bytes.length) {
            return false;
        }

        return signature.bytes.every((byte, i) => buffer[i] === byte);
    };

    describe("JPEG validation", () => {
        it("should validate valid JPEG magic bytes", () => {
            // JPEG starts with FF D8 FF
            const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
            expect(validateMagicBytes(validJpeg, "image/jpeg")).toBe(true);
        });

        it("should reject invalid JPEG magic bytes", () => {
            const invalidJpeg = Buffer.from([0x00, 0x00, 0x00]);
            expect(validateMagicBytes(invalidJpeg, "image/jpeg")).toBe(false);
        });

        it("should reject buffer shorter than signature", () => {
            const shortBuffer = Buffer.from([0xff, 0xd8]);
            expect(validateMagicBytes(shortBuffer, "image/jpeg")).toBe(false);
        });
    });

    describe("PNG validation", () => {
        it("should validate valid PNG magic bytes", () => {
            // PNG starts with 89 50 4E 47
            const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
            expect(validateMagicBytes(validPng, "image/png")).toBe(true);
        });

        it("should reject invalid PNG magic bytes", () => {
            const invalidPng = Buffer.from([0x00, 0x00, 0x00, 0x00]);
            expect(validateMagicBytes(invalidPng, "image/png")).toBe(false);
        });
    });

    describe("PDF validation", () => {
        it("should validate valid PDF magic bytes", () => {
            // PDF starts with %PDF (25 50 44 46)
            const validPdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
            expect(validateMagicBytes(validPdf, "application/pdf")).toBe(true);
        });

        it("should reject invalid PDF magic bytes", () => {
            const invalidPdf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
            expect(validateMagicBytes(invalidPdf, "application/pdf")).toBe(
                false,
            );
        });
    });

    describe("Unknown MIME type", () => {
        it("should reject unknown MIME type", () => {
            const buffer = Buffer.from([0xff, 0xd8, 0xff]);
            expect(validateMagicBytes(buffer, "application/unknown")).toBe(
                false,
            );
        });
    });

    describe("Security: Disguised files", () => {
        it("should reject EXE file with JPEG extension", () => {
            // EXE files start with MZ (4D 5A)
            const disguisedExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
            expect(validateMagicBytes(disguisedExe, "image/jpeg")).toBe(false);
        });

        it("should reject script disguised as PNG", () => {
            // Text/script content
            const script = Buffer.from("<script>alert(1)</script>", "utf-8");
            expect(validateMagicBytes(script, "image/png")).toBe(false);
        });
    });
});

describe("Upload Worksheet - Extension Validation", () => {
    const getValidExtension = (fileName: string): string | null => {
        const parts = fileName.split(".");
        if (parts.length < 2) {
            return null;
        }

        const ext = parts.pop()?.toLowerCase() ?? "";
        return ALLOWED_EXTENSIONS.has(ext) ? ext : null;
    };

    it("should return jpg for valid.jpg", () => {
        expect(getValidExtension("valid.jpg")).toBe("jpg");
    });

    it("should return jpeg for file.jpeg", () => {
        expect(getValidExtension("file.jpeg")).toBe("jpeg");
    });

    it("should return png for image.png", () => {
        expect(getValidExtension("image.png")).toBe("png");
    });

    it("should return pdf for document.pdf", () => {
        expect(getValidExtension("document.pdf")).toBe("pdf");
    });

    it("should handle uppercase extensions", () => {
        expect(getValidExtension("file.JPG")).toBe("jpg");
        expect(getValidExtension("file.PNG")).toBe("png");
        expect(getValidExtension("file.PDF")).toBe("pdf");
    });

    it("should return null for no extension", () => {
        expect(getValidExtension("filename")).toBe(null);
    });

    it("should return null for invalid extension", () => {
        expect(getValidExtension("file.exe")).toBe(null);
        expect(getValidExtension("script.js")).toBe(null);
        expect(getValidExtension("page.html")).toBe(null);
    });

    it("should handle multiple dots in filename", () => {
        expect(getValidExtension("my.file.name.jpg")).toBe("jpg");
        expect(getValidExtension("document.v2.pdf")).toBe("pdf");
    });

    it("should return null for double extension attacks", () => {
        // file.jpg.exe - should reject because final extension is exe
        expect(getValidExtension("file.jpg.exe")).toBe(null);
    });
});

describe("Upload Worksheet - Required Worksheets Configuration", () => {
    describe("REQUIRED_WORKSHEETS", () => {
        it("should require 2 worksheets for activity 1", () => {
            expect(REQUIRED_WORKSHEETS[1]).toBe(2);
        });

        it("should require 2 worksheets for activity 2", () => {
            expect(REQUIRED_WORKSHEETS[2]).toBe(2);
        });

        it("should require 2 worksheets for activity 3", () => {
            expect(REQUIRED_WORKSHEETS[3]).toBe(2);
        });

        it("should require 2 worksheets for activity 4", () => {
            expect(REQUIRED_WORKSHEETS[4]).toBe(2);
        });

        it("should require only 1 worksheet for activity 5", () => {
            expect(REQUIRED_WORKSHEETS[5]).toBe(1);
        });
    });

    describe("Completion Logic", () => {
        const isActivityComplete = (
            activityNumber: number,
            uploadedCount: number,
        ): boolean => {
            const required = REQUIRED_WORKSHEETS[activityNumber] || 2;
            return uploadedCount >= required;
        };

        it("should not be complete with 0 uploads for activity 1", () => {
            expect(isActivityComplete(1, 0)).toBe(false);
        });

        it("should not be complete with 1 upload for activity 1", () => {
            expect(isActivityComplete(1, 1)).toBe(false);
        });

        it("should be complete with 2 uploads for activity 1", () => {
            expect(isActivityComplete(1, 2)).toBe(true);
        });

        it("should be complete with 1 upload for activity 5", () => {
            expect(isActivityComplete(5, 1)).toBe(true);
        });

        it("should handle extra uploads gracefully", () => {
            expect(isActivityComplete(1, 5)).toBe(true);
        });
    });
});

describe("Upload Worksheet - Filename Generation", () => {
    const generateFileName = (
        studentId: string,
        activityNumber: number,
        extension: string,
    ): string => {
        const timestamp = Date.now();
        return `${studentId}_activity${activityNumber}_${timestamp}.${extension}`;
    };

    it("should include studentId in filename", () => {
        const filename = generateFileName("student123", 1, "jpg");
        expect(filename).toContain("student123");
    });

    it("should include activity number in filename", () => {
        const filename = generateFileName("student123", 3, "jpg");
        expect(filename).toContain("activity3");
    });

    it("should include extension", () => {
        const filename = generateFileName("student123", 1, "pdf");
        expect(filename).toMatch(/\.pdf$/);
    });

    it("should generate unique filenames (different timestamps)", async () => {
        const filename1 = generateFileName("student123", 1, "jpg");
        await new Promise((resolve) => setTimeout(resolve, 10));
        const filename2 = generateFileName("student123", 1, "jpg");
        expect(filename1).not.toBe(filename2);
    });
});
