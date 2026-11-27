/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedStudent } from "@/lib/utils/excel-parser";

const mocks = vi.hoisted(() => ({
    getCurrentAcademicYearTerms: vi.fn(),
    getCurrentTeacherProfile: vi.fn(),
    getSchoolClasses: vi.fn(),
    getIncompleteActivityWarning: vi.fn(),
    hasRound1Data: vi.fn(),
    importStudents: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/academic-year.actions", () => ({
    getCurrentAcademicYearTerms: mocks.getCurrentAcademicYearTerms,
}));
vi.mock("@/lib/actions/teacher.actions", () => ({ getCurrentTeacherProfile: mocks.getCurrentTeacherProfile }));
vi.mock("@/lib/actions/school-setup.actions", () => ({ getSchoolClasses: mocks.getSchoolClasses }));
vi.mock("@/lib/actions/student/main", () => ({
    getIncompleteActivityWarning: mocks.getIncompleteActivityWarning,
    hasRound1Data: mocks.hasRound1Data,
}));
vi.mock("@/lib/actions/student/mutations", () => ({ importStudents: mocks.importStudents }));

const { ImportPreview } = await import("@/components/student/import/ImportPreview/ImportPreview");
const { ImportResultDialog } = await import("@/components/student/import/ImportResultDialog");
const { countNumericStudentIds } = await import("@/components/student/import/ImportPreview/utils");
const { ImportActions } = await import("@/components/student/import/ImportPreview/components/ImportActions");

const WARNING_TITLE = "ข้อควรระวังเกี่ยวกับรหัสนักเรียน";

function student(studentId: string, options: { numeric?: boolean; className?: string; firstName?: string } = {}): ParsedStudent {
    return {
        studentId,
        ...(options.numeric ? { numericStudentId: true } : {}),
        nationalId: null,
        firstName: options.firstName ?? `ชื่อ${studentId}`,
        lastName: "ทดสอบ",
        gender: "MALE",
        age: 13,
        class: options.className ?? "ม.1/1",
        scores: { q1: 1, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q9a: false, q9b: false },
    };
}

async function renderPreview(data: ParsedStudent[]): Promise<HTMLElement> {
    render(<ImportPreview data={data} onCancel={vi.fn()} onSuccess={vi.fn()} canViewNationalId={false} />);
    const saveButton = await screen.findByRole("button", { name: /ตรวจสอบและนำเข้า/ });
    await waitFor(() => expect(saveButton).toHaveProperty("disabled", false));
    return saveButton;
}

function confirmDialog(): HTMLElement {
    return screen.getByRole("alertdialog", { name: "ยืนยันการนำเข้าข้อมูล" });
}

describe("numeric student ID warning in the import confirmation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getCurrentAcademicYearTerms.mockResolvedValue({
            status: "success",
            data: [{ id: "year-1", year: 2569, semester: 1, isCurrent: true }],
        });
        mocks.getCurrentTeacherProfile.mockResolvedValue({
            status: "success",
            data: { advisoryClass: "ทุกห้อง", user: { role: "school_admin" } },
        });
        mocks.getSchoolClasses.mockResolvedValue({
            status: "success",
            data: [{ id: "class-1", name: "ม.1/1", expectedStudentCount: 30 }],
        });
        mocks.hasRound1Data.mockResolvedValue({ status: "success", data: false });
        mocks.importStudents.mockResolvedValue({ success: true, status: "success", message: "ok", imported: 2 });
    });

    afterEach(() => cleanup());

    it("counts only numeric rows in the submitted payload after class filtering and removal", async () => {
        const saveButton = await renderPreview([
            student("4501", { numeric: true }),
            student("4502", { numeric: true }),
            student("4503", { numeric: true, className: "ม.9/9" }),
            student("A-1"),
        ]);

        fireEvent.click(screen.getByRole("button", { name: /ลบ ชื่อ4502 ทดสอบ/ }));
        fireEvent.click(screen.getByRole("button", { name: "ยืนยันลบ" }));
        fireEvent.click(saveButton);

        const dialog = confirmDialog();
        expect(within(dialog).getByText(WARNING_TITLE)).toBeTruthy();
        expect(within(dialog).getByText(/ตัวเลขจำนวน 1 รายการ/)).toBeTruthy();

        fireEvent.click(within(dialog).getByRole("button", { name: "ยืนยันนำเข้าข้อมูล" }));

        await waitFor(() => expect(mocks.importStudents).toHaveBeenCalledTimes(1));
        const [payload, yearId, round, options] = mocks.importStudents.mock.calls[0] ?? [];
        expect(payload.map((row: ParsedStudent) => row.studentId)).toEqual(["4501", "A-1"]);
        expect([yearId, round, options]).toEqual(["year-1", 1, { numericIdAcknowledged: true }]);
    });

    it("keeps text-only batches unchanged: no warning and no acknowledgement argument", async () => {
        const saveButton = await renderPreview([student("00123"), student("A-1")]);

        fireEvent.click(saveButton);
        expect(within(confirmDialog()).queryByText(WARNING_TITLE)).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "ยืนยันนำเข้าข้อมูล" }));

        await waitFor(() => expect(mocks.importStudents).toHaveBeenCalledTimes(1));
        expect(mocks.importStudents.mock.calls[0]).toHaveLength(3);
    });

    it.each([
        ["the back button", () => fireEvent.click(screen.getByRole("button", { name: "กลับไปแก้ไข" }))],
        ["Escape", () => fireEvent.keyDown(document, { key: "Escape" })],
    ])("closes without importing when dismissed with %s", async (_label, dismiss) => {
        const saveButton = await renderPreview([student("4501", { numeric: true })]);

        fireEvent.click(saveButton);
        expect(screen.getByText(WARNING_TITLE)).toBeTruthy();
        dismiss();

        expect(screen.queryByRole("alertdialog", { name: "ยืนยันการนำเข้าข้อมูล" })).toBeNull();
        expect(mocks.importStudents).not.toHaveBeenCalled();
    });

    it("submits once even when the confirm button is pressed repeatedly", async () => {
        mocks.importStudents.mockReturnValue(new Promise(() => undefined));
        const saveButton = await renderPreview([student("4501", { numeric: true })]);

        fireEvent.click(saveButton);
        const confirm = screen.getByRole("button", { name: "ยืนยันนำเข้าข้อมูล" });
        fireEvent.click(confirm);
        fireEvent.click(confirm);
        fireEvent.click(saveButton);

        await waitFor(() => expect(mocks.importStudents).toHaveBeenCalledTimes(1));
        expect(screen.queryByRole("alertdialog", { name: "ยืนยันการนำเข้าข้อมูล" })).toBeNull();
    });

    it("marks numeric rows in the preview table with a subtle indicator", async () => {
        await renderPreview([student("4501", { numeric: true }), student("00123")]);

        expect(screen.getAllByText("ตัวเลข")).toHaveLength(1);
    });
});

describe("numeric student ID helpers and result mapping", () => {
    afterEach(() => cleanup());

    it("closes the confirmation when the numeric count changes while it is open", () => {
        const onSave = vi.fn();
        const props = {
            onCancel: vi.fn(), onSave, isLoading: false, canSave: true, studentCount: 2,
            academicYearLabel: "2569 เทอม 1", assessmentRound: 1, incompleteWarning: null, zeroScoreWarning: null,
        };
        const { rerender } = render(<ImportActions {...props} numericStudentIdCount={2} />);

        fireEvent.click(screen.getByRole("button", { name: /ตรวจสอบและนำเข้า/ }));
        expect(screen.getByText(/ตัวเลขจำนวน 2 รายการ/)).toBeTruthy();
        rerender(<ImportActions {...props} numericStudentIdCount={1} />);
        expect(screen.queryByRole("alertdialog")).toBeNull();
        rerender(<ImportActions {...props} numericStudentIdCount={2} />);
        expect(screen.queryByRole("alertdialog")).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: /ตรวจสอบและนำเข้า/ }));
        fireEvent.click(screen.getByRole("button", { name: "ยืนยันนำเข้าข้อมูล" }));
        expect(onSave).toHaveBeenCalledExactlyOnceWith(2);
    });

    it("counts numeric provenance only", () => {
        expect(countNumericStudentIds([student("1", { numeric: true }), student("02"), student("3", { numeric: true })]))
            .toBe(2);
    });

    it("shows a resolved code mapping in the result dialog", () => {
        render(
            <ImportResultDialog
                result={{
                    success: true,
                    status: "success",
                    message: "นำเข้าสำเร็จทั้งหมด 1 คน",
                    imported: 1,
                    importedStudents: [
                        { studentId: "00123", sourceStudentId: "123", fullName: "สมชาย ใจดี", class: "ม.1/1" },
                    ],
                }}
                context={{ academicYearId: "year-1", academicYearLabel: "2569 เทอม 1", assessmentRound: 1, classNames: ["ม.1/1"] }}
                onClose={() => undefined}
                onViewStudents={() => undefined}
                onImportMore={() => undefined}
                onGoHome={() => undefined}
            />,
        );

        expect(screen.getByText("รหัสในไฟล์ 123 → ใช้รหัสในระบบ 00123")).toBeTruthy();
    });
});
