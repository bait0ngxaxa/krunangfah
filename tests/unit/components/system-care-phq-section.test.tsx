import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
    SystemCarePhqEditForm,
    type SystemPhqEditFormState,
} from "@/components/admin/system/SystemCarePhqEditForm";
import { SystemCarePhqSection } from "@/components/admin/system/SystemCarePhqSection";
import type { SystemPhqRecord } from "@/lib/actions/system-admin/types";

const roundOne: SystemPhqRecord = {
    id: "phq-round-1",
    academicYearLabel: "2569/1",
    isLatestTerm: true,
    assessmentRound: 1,
    q1: 1,
    q2: 1,
    q3: 1,
    q4: 1,
    q5: 1,
    q6: 1,
    q7: 1,
    q8: 1,
    q9: 1,
    q9a: false,
    q9b: false,
    totalScore: 9,
    riskLevel: "GREEN",
    referredToHospital: false,
    hospitalName: null,
    createdAt: new Date("2026-07-08T09:00:00.000Z"),
};

describe("SystemCarePhqSection", () => {
    it("shows PHQ editing for latest-term results instead of rollback copy", () => {
        const html = renderToStaticMarkup(
            <SystemCarePhqSection
                records={[roundOne]}
                editTarget={roundOne}
                editForm={{
                    q1: 1,
                    q2: 1,
                    q3: 1,
                    q4: 1,
                    q5: 1,
                    q6: 1,
                    q7: 1,
                    q8: 1,
                    q9: 1,
                    q9a: false,
                    q9b: false,
                    referredToHospital: false,
                    hospitalName: "",
                    reason: "",
                }}
                isPending={false}
                onStartEdit={vi.fn()}
                onEditChange={vi.fn()}
                onCancelEdit={vi.fn()}
                onSaveEdit={vi.fn()}
            />,
        );

        expect(html).toContain("แก้ไขผล PHQ รอบ 1");
        expect(html).toContain("มีบางวัน");
        expect(html).toContain("มีมากกว่า 7 วัน");
        expect(html).toContain("บันทึกผล PHQ");
        expect(html).not.toContain("ล้างผล PHQ");
    });

    it("hides hospital referral controls when edited PHQ scores are not red", () => {
        const html = renderToStaticMarkup(
            <SystemCarePhqEditForm
                title="แก้ไขผล PHQ รอบ 1"
                value={createFormState()}
                isPending={false}
                onChange={vi.fn()}
                onCancel={vi.fn()}
                onSave={vi.fn()}
            />,
        );

        expect(html).not.toContain("ส่งต่อโรงพยาบาล");
        expect(html).not.toContain("ชื่อโรงพยาบาล");
    });

    it("shows hospital referral controls when edited PHQ scores are red", () => {
        const html = renderToStaticMarkup(
            <SystemCarePhqEditForm
                title="แก้ไขผล PHQ รอบ 1"
                value={createFormState({
                    q1: 3,
                    q2: 3,
                    q3: 3,
                    q4: 3,
                    q5: 3,
                    q6: 3,
                    q7: 2,
                    referredToHospital: true,
                    hospitalName: "โรงพยาบาลทดสอบ",
                })}
                isPending={false}
                onChange={vi.fn()}
                onCancel={vi.fn()}
                onSave={vi.fn()}
            />,
        );

        expect(html).toContain("ส่งต่อโรงพยาบาล");
        expect(html).toContain("ชื่อโรงพยาบาล");
        expect(html).toContain("โรงพยาบาลทดสอบ");
    });
});

function createFormState(
    overrides: Partial<SystemPhqEditFormState> = {},
): SystemPhqEditFormState {
    return {
        q1: 1,
        q2: 1,
        q3: 1,
        q4: 1,
        q5: 1,
        q6: 1,
        q7: 1,
        q8: 1,
        q9: 1,
        q9a: false,
        q9b: false,
        referredToHospital: false,
        hospitalName: "",
        reason: "",
        ...overrides,
    };
}
