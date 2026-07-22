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
import type { StudentEntityResult } from "@/lib/actions/system-admin/types";

vi.mock("@/lib/actions/system-admin.actions", () => ({
    updateSystemAdminSchool: vi.fn(),
    updateSystemAdminStudent: vi.fn(),
}));

vi.mock("sonner", () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

const BASE_FORM: StudentProfileFormState = {
    studentId: "1001",
    nationalId: "",
    firstName: "สมชาย",
    lastName: "ใจดี",
    gender: "MALE",
    age: "13",
    class: "ม.1/1",
    status: "ACTIVE",
};

function StudentProfileHarness({
    initialNationalId = "",
}: {
    initialNationalId?: string;
}) {
    const [form, setForm] = useState({
        ...BASE_FORM,
        nationalId: initialNationalId,
    });

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

function createStudentEntity(nationalId = "G1234567890123"): StudentEntityResult {
    return {
        type: "student",
        id: "student-1",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        studentId: "1001",
        firstName: "สมชาย",
        lastName: "ใจดี",
        nationalIdMasked: "G*********0123",
        nationalId,
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
    it("uppercases g and rejects unsupported letters while typing", async () => {
        const user = userEvent.setup();
        render(<StudentProfileHarness />);
        const input = getNationalIdInput();

        await user.type(input, "g123A4");

        expect(input.value).toBe("G1234");
    });

    it("normalizes spaces and hyphens when pasting", async () => {
        const user = userEvent.setup();
        render(<StudentProfileHarness />);
        const input = getNationalIdInput();

        await user.click(input);
        await user.paste("g123-4567 89012-3");

        expect(input.value).toBe("G1234567890123");
    });

    it("changes the prefix only through an explicit edit", async () => {
        const user = userEvent.setup();
        render(<StudentProfileHarness initialNationalId="G1234567890123" />);
        const input = getNationalIdInput();

        await user.click(input);
        input.setSelectionRange(1, 1);
        await user.keyboard("{Backspace}");
        expect(input.value).toBe("1234567890123");

        input.setSelectionRange(0, 0);
        await user.keyboard("g");
        expect(input.value).toBe("G1234567890123");
    });

    it("preserves and edits a G identifier in the system admin form", async () => {
        const user = userEvent.setup();
        render(
            <SystemEditForm
                entity={createStudentEntity()}
                onSaved={vi.fn()}
                onCancel={vi.fn()}
            />,
        );
        const input = getNationalIdInput();

        expect(input.value).toBe("G1234567890123");
        await user.clear(input);
        await user.paste("g987-6543-21098-7");
        expect(input.value).toBe("G9876543210987");
    });
});
