import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EditEventRow } from "@/components/admin/system/SystemEventPanel";
import type { SystemAdminEditEventItem } from "@/lib/actions/system-admin/types";

vi.mock("@/lib/actions/data-management.actions", () => ({
    listDataManagementEvents: vi.fn(),
}));

vi.mock("@/lib/actions/system-admin.actions", () => ({
    listSystemAdminEvents: vi.fn(),
}));

function createEditEvent(): SystemAdminEditEventItem {
    return {
        id: "edit-1",
        targetType: "student",
        targetId: "student-1",
        reason: "แก้ข้อมูลนำเข้าผิด",
        actorEmail: "system.admin@example.com",
        targetLabel: "สมชาย ใจดี",
        changes: [
            {
                field: "class",
                label: "ห้อง",
                before: "ม.1/1",
                after: "ม.1/2",
            },
        ],
        createdAt: new Date("2026-07-08T09:00:00.000Z"),
    };
}

describe("EditEventRow", () => {
    it("stamps the admin email on system edit history rows", () => {
        const html = renderToStaticMarkup(
            <EditEventRow event={createEditEvent()} />,
        );

        expect(html).toContain("ทำรายการโดย system.admin@example.com");
    });
});
