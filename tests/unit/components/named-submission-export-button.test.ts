import { describe, expect, it } from "vitest";

import {
    getNamedSubmissionDownloadError,
    getNamedSubmissionDownloadFilename,
    getNamedSubmissionFailureMessage,
    getNamedSubmissionWorkbookValidationMessage,
} from "@/components/analytics/NamedSubmissionExportButton";

const XLSX_CONTENT_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function createResponse(
    status: number,
    body: BodyInit | null,
    headers: HeadersInit = {},
): Response {
    return new Response(body, { status, headers });
}

describe("NamedSubmissionExportButton hardening", () => {
    it("uses Thai API error messages from JSON responses", async () => {
        const response = createResponse(404, JSON.stringify({
            error: "ไม่พบข้อมูลผลคัดกรองตามตัวกรองที่เลือก",
        }), {
            "Content-Type": "application/json",
        });

        await expect(getNamedSubmissionDownloadError(response)).resolves.toBe(
            "ไม่พบข้อมูลผลคัดกรองตามตัวกรองที่เลือก",
        );
    });

    it("falls back to status-specific copy for non-JSON API errors", async () => {
        const response = createResponse(403, "<html>Forbidden</html>", {
            "Content-Type": "text/html",
        });

        await expect(getNamedSubmissionDownloadError(response)).resolves.toBe(
            "บัญชีนี้ไม่มีสิทธิ์ส่งออกรายชื่อ",
        );
    });

    it("decodes and preserves safe Thai workbook filenames", () => {
        const header =
            "attachment; filename*=UTF-8''%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%8A%E0%B8%B7%E0%B9%88%E0%B8%AD_%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99.xlsx";

        expect(getNamedSubmissionDownloadFilename(header)).toBe(
            "รายชื่อ_โรงเรียน.xlsx",
        );
    });

    it("sanitizes quoted filenames and keeps the xlsx extension", () => {
        const header = 'attachment; filename="../evil<>name"';

        expect(getNamedSubmissionDownloadFilename(header)).toBe(
            "evil-name.xlsx",
        );
    });

    it("rejects empty successful workbook responses", () => {
        const response = createResponse(200, null, {
            "Content-Type": XLSX_CONTENT_TYPE,
        });
        const blob = new Blob([]);

        expect(getNamedSubmissionWorkbookValidationMessage(response, blob)).toBe(
            "ไฟล์ส่งออกว่าง กรุณาปรับตัวกรองแล้วลองใหม่",
        );
    });

    it("rejects unexpected successful response types", () => {
        const response = createResponse(200, "<html>OK</html>", {
            "Content-Type": "text/html",
        });
        const blob = new Blob(["<html>OK</html>"], { type: "text/html" });

        expect(getNamedSubmissionWorkbookValidationMessage(response, blob)).toBe(
            "ไฟล์ส่งออกไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
        );
    });

    it("shows timeout guidance for aborted exports", () => {
        const error = { name: "AbortError" };

        expect(getNamedSubmissionFailureMessage(error)).toBe(
            "ใช้เวลาส่งออกนานเกินไป กรุณาปรับตัวกรองให้แคบลงแล้วลองใหม่",
        );
    });
});
