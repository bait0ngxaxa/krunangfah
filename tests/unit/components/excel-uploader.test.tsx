/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ExcelUploader } from "@/components/student/import/ExcelUploader";
import { parseExcelBuffer } from "@/lib/utils/excel-parser";
import ExcelJS from "exceljs";

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

it("downloads a template whose blank identifier example can be imported", async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:student-template");
    vi.stubGlobal("URL", class extends URL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = vi.fn();
    });
    const download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<ExcelUploader onDataParsed={vi.fn()} />);

    expect(screen.getByText(/หากยังไม่มี ให้เว้นช่องนี้ว่าง/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "ดาวน์โหลด template Excel" }));
    await waitFor(() => expect(download).toHaveBeenCalledOnce(), { timeout: 5_000 });
    const blob = createObjectURL.mock.calls[0]?.[0];
    if (!blob) throw new Error("Expected a workbook download");

    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) resolve(reader.result);
            else reject(new Error("Expected a workbook buffer"));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.worksheets[0].getColumn("A").numFmt).toBe("@");
    await expect(parseExcelBuffer(buffer)).resolves.toMatchObject({
        success: true,
        data: [{ studentId: "00123", nationalId: null }],
    });
}, 10_000);
