import { describe, expect, it } from "vitest";
import path from "path";
import {
    UPLOAD_WORKSHEETS_DIR,
    UPLOAD_WORKSHEETS_URL_PREFIX,
    buildWorksheetFilePath,
    buildWorksheetFileUrl,
    extractWorksheetFileName,
} from "@/lib/constants/uploads";

describe("uploads constants/helpers", () => {
    it("should expose stable worksheet url prefix", () => {
        expect(UPLOAD_WORKSHEETS_URL_PREFIX).toBe("/api/uploads/worksheets/");
    });

    it("should build worksheet file url and path", () => {
        const fileName = "abc_activity1_123.png";
        expect(buildWorksheetFileUrl(fileName)).toBe(
            "/api/uploads/worksheets/abc_activity1_123.png",
        );
        expect(buildWorksheetFilePath(fileName)).toBe(
            path.join(UPLOAD_WORKSHEETS_DIR, fileName),
        );
    });

    it("should extract filename only when url matches prefix", () => {
        expect(
            extractWorksheetFileName(
                "/api/uploads/worksheets/abc_activity1_123.png",
            ),
        ).toBe("abc_activity1_123.png");
        expect(extractWorksheetFileName("/api/uploads/home-visits/abc.jpg")).toBe(
            null,
        );
    });
});

