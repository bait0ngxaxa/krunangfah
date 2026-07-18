import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
    getReferralStatus,
    type ReferralHistoryRecord,
} from "@/types/referral.types";
import { ReferralHistoryTimeline } from "@/components/student/referral/ReferralHistoryTimeline";

function createRecord(
    id: string,
    createdAt: string,
    overrides: Partial<ReferralHistoryRecord> = {},
): ReferralHistoryRecord {
    return {
        id,
        studentId: "student-1",
        fromTeacherUserId: "from-1",
        toTeacherUserId: "to-1",
        fromTeacherName: "ผู้ส่ง",
        toTeacherName: "ผู้รับ",
        createdAt: new Date(createdAt),
        updatedAt: new Date(createdAt),
        revokedAt: null,
        revokedById: null,
        revokedByName: null,
        revokeReason: null,
        closedAt: null,
        status: "active",
        ...overrides,
    };
}

describe("referral history", () => {
    it("derives distinct statuses without mutating historical timestamps", () => {
        const revoked = createRecord("revoked", "2026-07-01T00:00:00.000Z", {
            revokedAt: new Date("2026-07-02T00:00:00.000Z"),
        });
        const closed = createRecord("closed", "2026-07-03T00:00:00.000Z", {
            closedAt: new Date("2026-07-04T00:00:00.000Z"),
        });

        expect(getReferralStatus(revoked)).toBe("revoked");
        expect(getReferralStatus(closed)).toBe("closed");
        expect(getReferralStatus(createRecord("active", "2026-07-05T00:00:00.000Z"))).toBe("active");
        expect(revoked.createdAt).toEqual(new Date("2026-07-01T00:00:00.000Z"));
    });

    it("renders newest history first and distinguishes revoke from replace", () => {
        const html = renderToStaticMarkup(
            <ReferralHistoryTimeline
                records={[
                    createRecord("old", "2026-07-01T00:00:00.000Z", {
                        revokedAt: new Date("2026-07-02T00:00:00.000Z"),
                        revokedByName: "ผู้เรียกคืน",
                        revokeReason: "ส่งต่อผิดคน",
                        status: "revoked",
                    }),
                    createRecord("new", "2026-07-03T00:00:00.000Z", {
                        closedAt: new Date("2026-07-04T00:00:00.000Z"),
                        toTeacherName: "ผู้รับใหม่",
                        status: "closed",
                    }),
                ]}
            />,
        );

        expect(html.indexOf('data-referral-id="new"')).toBeLessThan(
            html.indexOf('data-referral-id="old"'),
        );
        expect(html).toContain("เรียกคืน");
        expect(html).toContain("ปิดเมื่อเปลี่ยนผู้รับ");
        expect(html).toContain("ผู้เรียกคืน");
        expect(html).toContain("ส่งต่อผิดคน");
    });
});
