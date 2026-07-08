import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventRow } from "@/components/admin/data-management/EventRow";
import type { DataManagementEventItem } from "@/components/admin/data-management/types";

function createEvent(
    actorEmail: string | null = "admin@example.com",
): DataManagementEventItem {
    return {
        id: "event-1",
        targetType: "student",
        targetId: "student-1",
        action: "DISABLE",
        reason: "ปิดใช้งานข้อมูลผิด",
        actorUserId: "admin-1",
        actorEmail,
        targetLabel: "สมชาย ใจดี",
        warnings: [],
        createdAt: new Date("2026-07-08T09:00:00.000Z"),
    };
}

describe("EventRow", () => {
    it("stamps the admin email on data management history rows", () => {
        const html = renderToStaticMarkup(<EventRow event={createEvent()} />);

        expect(html).toContain("ทำรายการโดย admin@example.com");
    });

    it("shows a fallback when an older event has no admin email", () => {
        const html = renderToStaticMarkup(
            <EventRow event={createEvent(null)} compact />,
        );

        expect(html).toContain("ทำรายการโดย ไม่พบอีเมลผู้ทำรายการ");
    });
});
