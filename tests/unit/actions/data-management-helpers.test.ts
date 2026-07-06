import { describe, expect, it } from "vitest";
import {
    fileUrlToLocalPath,
    maskNationalId,
    toEventItem,
} from "@/lib/actions/data-management/helpers";
import { hasDataManagementSearchIntent } from "@/lib/actions/data-management/search-intent";
import { dataManagementReasonSchema } from "@/lib/validations/data-management.validation";

describe("data management helpers", () => {
    it("masks national id in search results", () => {
        expect(maskNationalId("1103700000011")).toBe("*********0011");
        expect(maskNationalId(null)).toBeNull();
    });

    it("rejects unsafe upload file paths", () => {
        expect(fileUrlToLocalPath("/api/uploads/worksheets/a.png")).toContain(
            "uploads",
        );
        expect(fileUrlToLocalPath("/api/uploads/../secret.txt")).toBeNull();
        expect(fileUrlToLocalPath("/public/worksheets/a.png")).toBeNull();
    });

    it("requires a reason for destructive actions", () => {
        const invalid = dataManagementReasonSchema.safeParse({
            id: "cmpjfvisu001bjx2mezlfvfdl",
            reason: "  ",
        });
        const valid = dataManagementReasonSchema.safeParse({
            id: "cmpjfvisu001bjx2mezlfvfdl",
            reason: "ลบข้อมูลทดสอบ",
        });

        expect(invalid.success).toBe(false);
        expect(valid.success).toBe(true);
    });

    it("requires a focused search intent before querying data management targets", () => {
        expect(hasDataManagementSearchIntent({})).toBe(false);
        expect(hasDataManagementSearchIntent({ query: "ก" })).toBe(false);
        expect(hasDataManagementSearchIntent({ query: "รร" })).toBe(true);
        expect(hasDataManagementSearchIntent({ dataState: "active" })).toBe(false);
        expect(hasDataManagementSearchIntent({ dataState: "disabled" })).toBe(true);
        expect(hasDataManagementSearchIntent({ dataState: "test" })).toBe(true);
        expect(hasDataManagementSearchIntent({ province: "เชียงใหม่" })).toBe(true);
    });

    it("maps event snapshots into list items", () => {
        const event = toEventItem({
            id: "event-1",
            targetType: "school",
            targetId: "school-1",
            action: "PERMANENT_DELETE",
            reason: "ลบข้อมูลทดสอบ",
            actorUserId: "user-1",
            actorSnapshot: { email: "admin@example.com" },
            targetSnapshot: { label: "โรงเรียนทดสอบ" },
            warnings: ["ลบไฟล์ไม่สำเร็จ"],
            createdAt: new Date("2026-07-06T00:00:00.000Z"),
        });

        expect(event.actorEmail).toBe("admin@example.com");
        expect(event.targetLabel).toBe("โรงเรียนทดสอบ");
        expect(event.warnings).toEqual(["ลบไฟล์ไม่สำเร็จ"]);
    });
});
