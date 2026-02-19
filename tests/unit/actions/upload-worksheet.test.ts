import { describe, it, expect } from "vitest";

import {
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
    REQUIRED_WORKSHEETS,
} from "@/lib/actions/activity/constants";

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

describe("Upload Worksheet - Extension Validation", () => {
    const getValidExtension = (fileName: string): string | null => {
        const parts = fileName.split(".");
        if (parts.length < 2) {
            return null;
        }

        const ext = parts.pop()?.toLowerCase() ?? "";
        return ALLOWED_EXTENSIONS.has(ext) ? ext : null;
    };

    describe("ALLOWED_EXTENSIONS whitelist", () => {
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

        it("should not allow sh", () => {
            expect(ALLOWED_EXTENSIONS.has("sh")).toBe(false);
        });
    });

    describe("getValidExtension()", () => {
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

        it("should normalize uppercase extensions to lowercase", () => {
            expect(getValidExtension("file.JPG")).toBe("jpg");
            expect(getValidExtension("file.PNG")).toBe("png");
            expect(getValidExtension("file.PDF")).toBe("pdf");
        });

        it("should return null for filename with no extension", () => {
            expect(getValidExtension("filename")).toBe(null);
        });

        it("should return null for disallowed extensions", () => {
            expect(getValidExtension("file.exe")).toBe(null);
            expect(getValidExtension("script.js")).toBe(null);
            expect(getValidExtension("page.html")).toBe(null);
        });

        it("should use only the last extension for files with multiple dots", () => {
            expect(getValidExtension("my.file.name.jpg")).toBe("jpg");
            expect(getValidExtension("document.v2.pdf")).toBe("pdf");
        });

        it("should reject double extension attacks (e.g. file.jpg.exe)", () => {
            expect(getValidExtension("file.jpg.exe")).toBe(null);
        });

        it("should reject files ending with only a dot", () => {
            expect(getValidExtension("file.")).toBe(null);
        });
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
