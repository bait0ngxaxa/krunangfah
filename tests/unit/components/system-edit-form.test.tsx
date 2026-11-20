import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SystemEditForm } from "@/components/admin/system/SystemEditForm";
import type { StudentEntityResult } from "@/lib/actions/system-admin/types";

vi.mock("@/lib/actions/system-admin.actions", () => ({
    updateSystemAdminSchool: vi.fn(),
    updateSystemAdminStudent: vi.fn(),
}));

vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

function createStudentEntity(
    nationalId = "1234567890123",
): StudentEntityResult {
    return {
        type: "student",
        id: "student-1",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        studentId: "1001",
        firstName: "สมชาย",
        lastName: "ใจดี",
        nationalIdMasked: nationalId.startsWith("G")
            ? "G*********0123"
            : "*********0123",
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
        classOptions: [
            { id: "class-1", name: "ม.1/1" },
            { id: "class-2", name: "ม.1/2" },
        ],
    };
}

describe("SystemEditForm", () => {
    it("uses a dropdown for editing a student's class", () => {
        const html = renderToStaticMarkup(
            <SystemEditForm
                entity={createStudentEntity()}
                onSaved={vi.fn()}
                onCancel={vi.fn()}
            />,
        );

        expect(html).toMatch(/<span[^>]*>ห้อง<\/span><select/);
        expect(html).toContain('<option value="ม.1/2">ม.1/2</option>');
    });

    it("renders only the mask until an admin requests the identifier", () => {
        const html = renderToStaticMarkup(
            <SystemEditForm
                entity={createStudentEntity("G1234567890123")}
                onSaved={vi.fn()}
                onCancel={vi.fn()}
            />,
        );

        expect(html).toContain("G*********0123");
        expect(html).not.toContain("G1234567890123");
    });
});
