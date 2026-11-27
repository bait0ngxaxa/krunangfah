import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ academicYearFindUnique: vi.fn() }));

vi.mock("@/lib/database/prisma", () => ({
    prisma: { academicYear: { findUnique: mocks.academicYearFindUnique } },
}));

const { checkImportTerm, NON_CURRENT_IMPORT_TERM_MESSAGE } = await import(
    "@/lib/services/import-term-policy"
);

describe("checkImportTerm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it.each([1, 2])("allows semester %i of the current academic year", async (semester) => {
        mocks.academicYearFindUnique.mockResolvedValue({ id: "ay-current", year: 2569, semester });

        await expect(checkImportTerm("ay-current", 2569)).resolves.toEqual({
            kind: "allowed",
            term: { id: "ay-current", year: 2569, semester },
        });
    });

    it("rejects a previous academic year", async () => {
        mocks.academicYearFindUnique.mockResolvedValue({ id: "ay-old", year: 2568, semester: 2 });

        await expect(checkImportTerm("ay-old", 2569)).resolves.toEqual({ kind: "not_current" });
    });

    it("derives the current year from the Bangkok clock by default", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        // 27 Nov 2026 is semester 2 of academic year 2569.
        vi.setSystemTime(new Date("2026-11-27T03:00:00.000Z"));
        mocks.academicYearFindUnique.mockResolvedValue({ id: "ay-2569-2", year: 2569, semester: 2 });

        await expect(checkImportTerm("ay-2569-2")).resolves.toMatchObject({ kind: "allowed" });
        vi.useRealTimers();
    });

    it("reports an unknown or empty term id as not found", async () => {
        mocks.academicYearFindUnique.mockResolvedValue(null);

        await expect(checkImportTerm("missing", 2569)).resolves.toEqual({ kind: "not_found" });
        await expect(checkImportTerm("", 2569)).resolves.toEqual({ kind: "not_found" });
        expect(mocks.academicYearFindUnique).toHaveBeenCalledTimes(1);
    });

    it("uses the agreed Thai copy", () => {
        expect(NON_CURRENT_IMPORT_TERM_MESSAGE).toBe(
            "ปีการศึกษาที่เลือกไม่ใช่ปีการศึกษาปัจจุบัน กรุณารีเฟรชหน้าแล้วเลือกใหม่",
        );
    });
});
