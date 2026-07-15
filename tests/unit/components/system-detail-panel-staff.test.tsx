import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/system-admin.actions", () => ({
    updateSystemAdminSchool: vi.fn(),
    updateSystemAdminStudent: vi.fn(),
    updateSystemAdminTeacherProfile: vi.fn(),
}));

vi.mock("@/components/admin/system/SystemCareRecordsPanel", () => ({
    SystemCareRecordsPanel: () => <div>care records</div>,
}));

vi.mock("@/components/admin/system/SystemDataManagementSection", () => ({
    SystemDataManagementSection: () => <div>data management</div>,
}));

vi.mock("@/components/admin/system/SystemStaffActions", () => ({
    SystemStaffActions: () => <div>จัดการบัญชีบุคลากร</div>,
}));

vi.mock("@/components/admin/system/SystemTeacherProfileForm", () => ({
    SystemTeacherProfileForm: () => <div>ฟอร์มโปรไฟล์ครูเปิดอยู่</div>,
}));

import { SystemDetailPanel } from "@/components/admin/system/SystemDetailPanel";
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

const emptyResults: SystemSearchResult = {
    schools: [],
    staffs: [],
    students: [],
};

describe("SystemDetailPanel staff profile controls", () => {
    it("shows the teacher profile edit toggle in the detail area", () => {
        const html = renderToStaticMarkup(
            <SystemDetailPanel
                entity={staff}
                onEntityUpdated={() => undefined}
                onEntityRemoved={() => undefined}
                onRefreshSearch={async () => emptyResults}
            />,
        );

        expect(html).toContain("โปรไฟล์ครู");
        expect(html).toContain("แก้ไขโปรไฟล์ครู");
        expect(html).toContain("จัดการบัญชีบุคลากร");
        expect(html).not.toContain("ฟอร์มโปรไฟล์ครูเปิดอยู่");
    });
});
