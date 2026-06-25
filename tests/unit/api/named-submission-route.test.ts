import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    createNamedSubmissionExport: vi.fn(),
    requireAdmin: vi.fn(),
    requirePrimaryAdmin: vi.fn(),
    logError: vi.fn(),
}));

vi.mock("@/lib/exports/named-submission/service", () => ({
    createNamedSubmissionExport: mocks.createNamedSubmissionExport,
}));

vi.mock("@/lib/session", () => ({
    requireAdmin: mocks.requireAdmin,
    requirePrimaryAdmin: mocks.requirePrimaryAdmin,
}));

vi.mock("@/lib/utils/logging", () => ({
    logError: mocks.logError,
}));

const { GET } = await import("@/app/api/v1/exports/named-submission/route");

describe("named submission export route", () => {
    beforeEach(() => {
        mocks.createNamedSubmissionExport.mockReset();
        mocks.requireAdmin.mockReset();
        mocks.requirePrimaryAdmin.mockReset();
        mocks.logError.mockReset();
    });

    it("returns 404 instead of an empty workbook", async () => {
        mocks.requireAdmin.mockResolvedValue({});
        mocks.createNamedSubmissionExport.mockResolvedValue({
            content: null,
            filename: null,
            rowCount: 0,
        });

        const response = await GET(
            new NextRequest(
                "http://localhost/api/v1/exports/named-submission?school=cm9lt9j8f0000z1ntt9r2w0ab",
            ),
        );

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            error: "ไม่พบข้อมูลผลคัดกรองตามตัวกรองที่เลือก",
        });
    });

    it("requires system_admin to select a school before exporting", async () => {
        mocks.requireAdmin.mockResolvedValue({});

        const response = await GET(
            new NextRequest("http://localhost/api/v1/exports/named-submission"),
        );

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: "กรุณาเลือกโรงเรียนก่อนส่งออกรายชื่อ",
        });
        expect(mocks.createNamedSubmissionExport).not.toHaveBeenCalled();
    });

    it("rejects invalid filters before querying export data", async () => {
        const response = await GET(
            new NextRequest(
                "http://localhost/api/v1/exports/named-submission?semester=3",
            ),
        );

        expect(response.status).toBe(400);
        expect(mocks.requireAdmin).not.toHaveBeenCalled();
        expect(mocks.createNamedSubmissionExport).not.toHaveBeenCalled();
    });

    it("overrides the school filter for a primary school_admin", async () => {
        mocks.requireAdmin.mockRejectedValue(new Error("Forbidden"));
        mocks.requirePrimaryAdmin.mockResolvedValue({
            user: { schoolId: "cm9lt9j8f0000z1ntt9r2w0ab" },
        });
        mocks.createNamedSubmissionExport.mockResolvedValue({
            content: new Uint8Array([1]),
            filename: "รายชื่อผลคัดกรอง_โรงเรียนทดสอบ.xlsx",
            rowCount: 1,
        });

        const response = await GET(
            new NextRequest(
                "http://localhost/api/v1/exports/named-submission?school=cm9lt9j8f0000z1ntt9r2w0ac",
            ),
        );

        expect(response.status).toBe(200);
        expect(decodeURIComponent(response.headers.get("Content-Disposition") ?? "")).toContain(
            "รายชื่อผลคัดกรอง_โรงเรียนทดสอบ.xlsx",
        );
        expect(mocks.createNamedSubmissionExport).toHaveBeenCalledWith({
            schoolId: "cm9lt9j8f0000z1ntt9r2w0ab",
        });
    });
});
