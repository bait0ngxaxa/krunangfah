// @vitest-environment jsdom

import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
    StudentProfileFields,
    type StudentProfileFormState,
} from "@/components/student/profile/StudentProfileEditFields";
import { SystemEditForm } from "@/components/admin/system/SystemEditForm";
import { getSystemAdminStudentIdentifier } from "@/lib/actions/system-admin.actions";
import { StudentIdentifierEditor } from "@/components/student/profile/StudentIdentifierEditor";
import { getStudentIdentifierForEdit, updateStudentIdentifier } from "@/lib/actions/student/mutations";
import type { StudentEntityResult } from "@/lib/actions/system-admin/types";

vi.mock("@/lib/actions/system-admin.actions", () => ({
    getSystemAdminStudentIdentifier: vi.fn(),
    updateSystemAdminSchool: vi.fn(),
    updateSystemAdminStudent: vi.fn(),
}));

vi.mock("@/lib/actions/student/mutations", () => ({
    getStudentIdentifierForEdit: vi.fn(),
    updateStudentIdentifier: vi.fn(),
}));

vi.mock("sonner", () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

const BASE_FORM: StudentProfileFormState = {
    studentId: "1001",
    firstName: "สมชาย",
    lastName: "ใจดี",
    gender: "MALE",
    age: "13",
    class: "ม.1/1",
    status: "ACTIVE",
};

function StudentProfileHarness() {
    const [form, setForm] = useState(BASE_FORM);

    return (
        <StudentProfileFields
            form={form}
            isProfileLocked={false}
            isPending={false}
            updateField={(field, value) => {
                setForm((current) => ({ ...current, [field]: value }));
            }}
        />
    );
}

function createStudentEntity(): StudentEntityResult {
    return {
        type: "student",
        id: "student-1",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        studentId: "1001",
        firstName: "สมชาย",
        lastName: "ใจดี",
        nationalIdMasked: "G*********0123",
        gender: "MALE",
        age: 13,
        class: "ม.1/1",
        status: "ACTIVE",
        disabledAt: null,
        isTestData: false,
        schoolId: "school-1",
        schoolName: "โรงเรียนทดสอบ",
        schoolDisabledAt: null,
        schoolIsTestData: false,
        classOptions: [{ id: "class-1", name: "ม.1/1" }],
    };
}

function getNationalIdInput(): HTMLInputElement {
    return screen.getByLabelText("เลขบัตรประชาชน") as HTMLInputElement;
}

describe("national ID input interactions", () => {
    async function openIdentifierEditor(user: ReturnType<typeof userEvent.setup>): Promise<HTMLInputElement> {
        vi.mocked(getStudentIdentifierForEdit).mockResolvedValue({ success: true, masked: "G*********0123", updatedAt: "2026-01-01T00:00:00.000Z" });
        render(<StudentIdentifierEditor studentId="student-1" activePhqResultId="phq-1" />);
        await user.click(screen.getByRole("button", { name: "จัดการเลขประจำตัว" }));
        return await screen.findByLabelText("เลขประจำตัวใหม่") as HTMLInputElement;
    }

    it("keeps the identifier field out of the general profile form", () => {
        render(<StudentProfileHarness />);
        expect(screen.queryByLabelText(/เลขบัตรประชาชน|เลขประจำตัว/)).toBeNull();
    });

    it("uppercases g and rejects unsupported letters while typing", async () => {
        const user = userEvent.setup();
        const input = await openIdentifierEditor(user);
        expect(input.value).toBe("");
        expect(input.maxLength).toBe(14);
        expect(screen.getByText("เลขปัจจุบัน G*********0123")).toBeTruthy();

        await user.type(input, "g123A4");

        expect(input.value).toBe("G1234");
    });

    it("normalizes spaces and hyphens when pasting", async () => {
        const user = userEvent.setup();
        const input = await openIdentifierEditor(user);

        await user.click(input);
        await user.paste("g123-4567 89012-3");

        expect(input.value).toBe("G1234567890123");
    });

    it("asks for explicit confirmation before sending a null identifier", async () => {
        vi.mocked(updateStudentIdentifier).mockResolvedValue({ success: true, message: "บันทึกแล้ว" });
        const user = userEvent.setup();
        await openIdentifierEditor(user);
        await user.click(screen.getByRole("button", { name: "ล้างเลขประจำตัว" }));
        expect(updateStudentIdentifier).not.toHaveBeenCalled();
        await user.click(screen.getByRole("button", { name: "ยืนยันการล้างเลข" }));
        expect(updateStudentIdentifier).not.toHaveBeenCalled();
        await user.type(screen.getByLabelText("เหตุผลที่เปลี่ยนเลขประจำตัว"), "ตรวจสอบกับทะเบียนแล้ว");
        await user.click(screen.getByRole("button", { name: "ยืนยันการล้างเลข" }));
        expect(updateStudentIdentifier).toHaveBeenCalledWith("student-1", {
            nationalId: null, expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
            reason: "ตรวจสอบกับทะเบียนแล้ว",
        }, { activePhqResultId: "phq-1" });
    });

    it("preserves and edits a G identifier in the system admin form", async () => {
        vi.mocked(getSystemAdminStudentIdentifier).mockResolvedValue({
            status: "success", data: { nationalId: "G1234567890123" },
        });
        const user = userEvent.setup();
        render(
            <SystemEditForm
                entity={createStudentEntity()}
                onSaved={vi.fn()}
                onCancel={vi.fn()}
            />,
        );
        expect(screen.getByText("G*********0123")).toBeTruthy();
        expect(screen.queryByLabelText("เลขบัตรประชาชน")).toBeNull();
        await user.click(screen.getByRole("button", { name: "เปิดเลขประจำตัวเพื่อแก้ไข" }));
        const input = getNationalIdInput();

        expect(input.value).toBe("G1234567890123");
        await user.clear(input);
        await user.paste("g987-6543-21098-7");
        expect(input.value).toBe("G9876543210987");
    });
});
