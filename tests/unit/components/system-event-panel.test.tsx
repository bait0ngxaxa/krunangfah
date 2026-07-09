import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
    buildAuditTimeline,
    DataManagementAuditEventRow,
    EditEventRow,
} from "@/components/admin/system/SystemEventPanel";
import type { DataManagementEventItem } from "@/lib/actions/data-management/types";
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
        action: "EDIT",
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

function createDataManagementEvent(): DataManagementEventItem {
    return {
        id: "data-event-1",
        action: "DISABLE",
        targetType: "student",
        targetId: "student-1",
        reason: "ปิดใช้งานข้อมูลซ้ำ",
        actorUserId: "admin-1",
        actorEmail: "system.admin@example.com",
        targetLabel: "สมชาย ใจดี",
        warnings: [],
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

    it("renders detailed before and after values for each changed field", () => {
        const html = renderToStaticMarkup(
            <EditEventRow event={createEditEvent()} />,
        );

        expect(html).toContain("ห้อง");
        expect(html).toContain("จาก ม.1/1");
        expect(html).toContain("เป็น ม.1/2");
    });

    it("renders data-management history with the same action and target header pattern", () => {
        const html = renderToStaticMarkup(
            <DataManagementAuditEventRow event={createDataManagementEvent()} />,
        );

        expect(html).toContain("ปิดใช้งาน: สมชาย ใจดี");
        expect(html).toContain("ทำรายการโดย system.admin@example.com");
        expect(html).toContain("ปิดใช้งานข้อมูลซ้ำ");
    });

    it("merges both audit sources into one chronological timeline", () => {
        const olderEditEvent = createEditEvent();
        const newerDataEvent = {
            ...createDataManagementEvent(),
            createdAt: new Date("2026-07-08T10:00:00.000Z"),
        };
        const newestEditEvent = {
            ...createEditEvent(),
            id: "edit-2",
            createdAt: new Date("2026-07-08T11:00:00.000Z"),
        };

        const timeline = buildAuditTimeline(
            [newerDataEvent],
            [olderEditEvent, newestEditEvent],
        );

        expect(timeline.map((item) => item.event.id)).toEqual([
            "edit-2",
            "data-event-1",
            "edit-1",
        ]);
    });
});
