import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
    CareRecordSections,
    type DeleteTarget,
} from "@/components/admin/system/SystemCareRecordSections";
import type { SystemCareRecordResponse } from "@/lib/actions/system-admin/types";
import { filterSystemCareRecords } from "@/lib/utils/system-care-record-filter";

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

describe("filterSystemCareRecords", () => {
    it("keeps records in the selected PHQ context", () => {
        const data = createCareRecords();
        data.phqResults = [
            createPhq("phq-new", "year-new", "2569/2", 2),
            createPhq("phq-old", "year-old", "2568/2", 1),
        ];
        data.activityProgress = [
            createActivity("activity-new", "phq-new", "2569/2", 2),
            createActivity("activity-old", "phq-old", "2568/2", 1),
        ];
        data.counselingSessions = [
            { ...data.counselingSessions[0]!, id: "counsel-new", academicYearId: "year-new", academicYearLabel: "2569/2" },
            { ...data.counselingSessions[0]!, id: "counsel-old", academicYearId: "year-old", academicYearLabel: "2568/2" },
        ];
        data.homeVisits = [
            { ...data.homeVisits[0]!, id: "visit-new", academicYearId: "year-new", academicYearLabel: "2569/2" },
            { ...data.homeVisits[0]!, id: "visit-old", academicYearId: "year-old", academicYearLabel: "2568/2" },
        ];

        const filtered = filterSystemCareRecords(data, "phq-old");

        expect(filtered.phqResults.map((record) => record.id)).toEqual(["phq-old"]);
        expect(filtered.activityProgress.map((record) => record.id)).toEqual(["activity-old"]);
        expect(filtered.counselingSessions.map((record) => record.id)).toEqual(["counsel-old"]);
        expect(filtered.homeVisits.map((record) => record.id)).toEqual(["visit-old"]);
    });
});

function render(deleteTarget: DeleteTarget): string {
    return renderToStaticMarkup(
        <CareRecordSections
            data={createCareRecords()}
            allowMutations
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
        referralHistory: [],
        teacherOptions: [],
        counselingSessions: [{
            id: counselingId,
            academicYearId: null,
            academicYearLabel: null,
            sessionNumber: 1,
            sessionDate: new Date("2026-07-08T09:00:00.000Z"),
            counselorName: "ครูแนะแนว",
            summary: "บันทึกการให้คำปรึกษา",
            createdAt: new Date("2026-07-08T09:00:00.000Z"),
            updatedAt: new Date("2026-07-08T09:00:00.000Z"),
        }],
        homeVisits: [{
            id: homeVisitId,
            academicYearId: null,
            academicYearLabel: null,
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

function createPhq(id: string, academicYearId: string, academicYearLabel: string, assessmentRound: number) {
    return {
        id, academicYearId, academicYearLabel, assessmentRound, isLatestTerm: true,
        q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0,
        q9a: false, q9b: false, totalScore: 0, riskLevel: "blue",
        referredToHospital: false, hospitalName: null,
        createdAt: new Date("2026-07-08T09:00:00.000Z"),
        updatedAt: new Date("2026-07-08T09:00:00.000Z"),
    };
}

function createActivity(id: string, phqResultId: string, academicYearLabel: string, assessmentRound: number) {
    return {
        id, phqResultId, academicYearLabel, assessmentRound, activityNumber: 1,
        status: "completed", scheduledDate: null, completedAt: null, teacherId: null,
        teacherName: null, teacherNotes: null, internalProblems: null,
        externalProblems: null, problemType: null,
        updatedAt: new Date("2026-07-08T09:00:00.000Z"),
    };
}
