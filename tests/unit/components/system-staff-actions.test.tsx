import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/user-management.actions", () => ({
    changeUserRole: vi.fn(),
    deleteUser: vi.fn(),
}));

vi.mock("@/lib/actions/system-admin-staff-account.actions", () => ({
    restoreSystemAdminStaffAccount: vi.fn(),
    permanentlyDeleteSystemAdminStaffAccount: vi.fn(),
}));

vi.mock("@/components/teacher/forms/TeacherAdvisoryClassForm", () => ({
    TeacherAdvisoryClassForm: () => <div>ฟอร์มห้องที่ปรึกษา</div>,
}));

import { SystemStaffActions } from "@/components/admin/system/SystemStaffActions";
import type {
    StaffEntityResult,
    SystemSearchResult,
} from "@/lib/actions/system-admin/types";

const staff: StaffEntityResult = {
    type: "staff",
    id: "cmuser000000000000000001",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    email: "teacher@example.com",
    name: "สมชาย ใจดี",
    role: "school_admin",
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
    advisoryClass: "ทุกห้อง",
    schoolRole: "ครูแนะแนว",
    projectRole: "care",
};

const classTeacherStaff: StaffEntityResult = {
    ...staff,
    role: "class_teacher",
    isPrimary: false,
    advisoryClass: "ม.1/1",
};

const emptyResults: SystemSearchResult = {
    schools: [],
    staffs: [],
    students: [],
};

describe("SystemStaffActions", () => {
    it("keeps staff account actions separate from teacher profile editing", () => {
        const html = renderToStaticMarkup(
            <SystemStaffActions
                entity={staff}
                onEntityUpdated={() => undefined}
                onEntityRemoved={() => undefined}
                onRefreshSearch={async () => emptyResults}
            />,
        );

        expect(html).toContain("จัดการบัญชีบุคลากร");
        expect(html).toContain("เปลี่ยนบทบาท");
        expect(html).not.toContain("แก้ไขโปรไฟล์ครู");
    });

    it("does not offer primary school admin for class_teacher accounts", () => {
        const html = renderToStaticMarkup(
            <SystemStaffActions
                entity={classTeacherStaff}
                onEntityUpdated={() => undefined}
                onEntityRemoved={() => undefined}
                onRefreshSearch={async () => emptyResults}
            />,
        );

        expect(html).not.toContain("ผู้ดูแลโรงเรียน");
        expect(html).toContain("ครูนางฟ้า");
        expect(html).toContain("ครูประจำชั้น");
    });

    it("offers restore and permanent delete for a closed teacher account", () => {
        const html = renderToStaticMarkup(
            <SystemStaffActions
                entity={{ ...classTeacherStaff, deletedAt: new Date() }}
                onEntityUpdated={() => undefined}
                onEntityRemoved={() => undefined}
                onRefreshSearch={async () => emptyResults}
            />,
        );

        expect(html).toContain("กู้คืนบัญชี");
        expect(html).toContain("ลบถาวร");
        expect(html).not.toContain("ปิดบัญชีเพื่อหยุดการเข้าใช้");
    });
});
