import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/system-admin.actions", () => ({
    updateSystemAdminTeacherProfile: vi.fn(),
}));

import { SystemTeacherProfileForm } from "@/components/admin/system/SystemTeacherProfileForm";
import type { StaffEntityResult } from "@/lib/actions/system-admin/types";

const staff: StaffEntityResult = {
    type: "staff",
    id: "cmuser000000000000000001",
    email: "teacher@example.com",
    name: "สมชาย ใจดี",
    role: "class_teacher",
    isPrimary: false,
    deletedAt: null,
    schoolId: "cmschool0000000000000001",
    schoolName: "โรงเรียนทดสอบ",
    hasTeacherProfile: true,
    teacherId: "cmteacher00000000000001",
    teacherName: "สมชาย ใจดี",
    firstName: "สมชาย",
    lastName: "ใจดี",
    age: 40,
    advisoryClass: "ม.1/1",
    schoolRole: "ครูแนะแนว",
    projectRole: "care",
};

describe("SystemTeacherProfileForm", () => {
    it("renders general teacher profile fields beyond account role", () => {
        const html = renderToStaticMarkup(
            <SystemTeacherProfileForm
                entity={staff}
                onSaved={() => undefined}
                onCancel={() => undefined}
            />,
        );

        expect(html).toContain("แก้ไขโปรไฟล์ครู");
        expect(html).toContain("ชื่อ");
        expect(html).toContain("นามสกุล");
        expect(html).toContain("อายุ");
        expect(html).toContain("บทบาทในโรงเรียน");
        expect(html).toContain("บทบาทโครงการ");
        expect(html).toContain("เหตุผลการแก้ไข");
    });
});
