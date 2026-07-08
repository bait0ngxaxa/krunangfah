import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SystemCareActivityGroups } from "@/components/admin/system/SystemCareActivityGroups";
import type { SystemActivityRecord } from "@/lib/actions/system-admin/types";

function createActivity(
    id: string,
    status: string,
    activityNumber: number,
): SystemActivityRecord {
    return {
        id,
        phqResultId: "phq-1",
        academicYearLabel: "2569/1",
        assessmentRound: 1,
        activityNumber,
        status,
        scheduledDate: null,
        completedAt: status === "completed"
            ? new Date("2026-07-08T09:00:00.000Z")
            : null,
        teacherId: null,
        teacherName: null,
        teacherNotes: null,
        internalProblems: null,
        externalProblems: null,
        problemType: null,
    };
}

function render(records: SystemActivityRecord[]): string {
    return renderToStaticMarkup(
        <SystemCareActivityGroups
            records={records}
            resetTarget={null}
            resetReason=""
            isPending={false}
            onStartReset={vi.fn()}
            onReasonChange={vi.fn()}
            onCancelReset={vi.fn()}
            onReset={vi.fn()}
        />,
    );
}

describe("SystemCareActivityGroups", () => {
    it("shows rollback control for completed activities only", () => {
        const html = render([
            createActivity("activity-1", "completed", 1),
            createActivity("activity-2", "in_progress", 2),
            createActivity("activity-3", "locked", 3),
        ]);

        expect(html.match(/aria-label="ล้างผลกิจกรรมที่/g)).toHaveLength(1);
        expect(html).toContain("เสร็จแล้ว");
        expect(html).toContain("กำลังดำเนินการ");
        expect(html).toContain("ยังไม่เปิด");
    });

    it("does not show rollback control when no activity is completed", () => {
        const html = render([
            createActivity("activity-2", "in_progress", 2),
            createActivity("activity-3", "locked", 3),
        ]);

        expect(html).not.toContain("aria-label=\"ล้างผลกิจกรรมที่");
    });
});
