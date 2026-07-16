import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
    CareRecordSections,
    type DeleteTarget,
} from "@/components/admin/system/SystemCareRecordSections";
import type { SystemCareRecordResponse } from "@/lib/actions/system-admin/types";

const counselingId = "cmcounseling0000000000001";
const homeVisitId = "cmhomevisit00000000000001";

describe("CareRecordSections", () => {
    it("renders counseling delete reason inline before the home visit section", () => {
        const html = render({
            type: "counselingSession",
            id: counselingId,
            expectedUpdatedAt: new Date("2026-07-08T09:00:00.000Z"),
            label: "การให้คำปรึกษาครั้งที่ 1",
        });

        const counselingIndex = html.indexOf("การให้คำปรึกษา");
        const reasonIndex = html.indexOf("ลบ การให้คำปรึกษาครั้งที่ 1");
        const homeVisitIndex = html.indexOf("เยี่ยมบ้าน");

        expect(counselingIndex).toBeGreaterThanOrEqual(0);
        expect(reasonIndex).toBeGreaterThan(counselingIndex);
        expect(reasonIndex).toBeLessThan(homeVisitIndex);
    });
});

function render(deleteTarget: DeleteTarget): string {
    return renderToStaticMarkup(
        <CareRecordSections
            data={createCareRecords()}
            deleteTarget={deleteTarget}
            deleteReason=""
            isPending={false}
            onStartDelete={vi.fn()}
            onReasonChange={vi.fn()}
            onCancelDelete={vi.fn()}
            onDelete={vi.fn()}
        />,
    );
}

function createCareRecords(): SystemCareRecordResponse {
    return {
        phqResults: [],
        activityProgress: [],
        referral: null,
        teacherOptions: [],
        counselingSessions: [{
            id: counselingId,
            sessionNumber: 1,
            sessionDate: new Date("2026-07-08T09:00:00.000Z"),
            counselorName: "ครูแนะแนว",
            summary: "บันทึกการให้คำปรึกษา",
            createdAt: new Date("2026-07-08T09:00:00.000Z"),
            updatedAt: new Date("2026-07-08T09:00:00.000Z"),
        }],
        homeVisits: [{
            id: homeVisitId,
            visitNumber: 1,
            visitDate: new Date("2026-07-08T09:00:00.000Z"),
            description: "เยี่ยมบ้าน",
            nextScheduledDate: null,
            teacherName: "ครูประจำชั้น",
            teacherRole: "ครูที่ปรึกษา",
            photoCount: 0,
            createdAt: new Date("2026-07-08T09:00:00.000Z"),
            updatedAt: new Date("2026-07-08T09:00:00.000Z"),
        }],
    };
}
