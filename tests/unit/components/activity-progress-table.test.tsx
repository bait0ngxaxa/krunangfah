import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getActivityProgress: vi.fn(),
}));

vi.mock("@/lib/actions/activity", () => ({
    getActivityProgress: mocks.getActivityProgress,
}));

vi.mock(
    "@/components/student/activity/ActivityProgressTable/ActivityRow",
    () => ({
        ActivityRow: () => <div>activity-row</div>,
    }),
);

const { ActivityProgressTable } = await import(
    "@/components/student/activity/ActivityProgressTable/ActivityProgressTable"
);

const baseProps = {
    studentId: "student-1",
    phqResultId: "phq-1",
    riskLevel: "green" as const,
    assessmentPeriod: {
        academicYear: 2569,
        semester: 1,
        assessmentRound: 1,
    },
};

describe("ActivityProgressTable assessment rounds", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getActivityProgress.mockResolvedValue({
            status: "success",
            data: [createActivity()],
        });
    });

    it("keeps the normal activity workflow for round 1", async () => {
        const element = await ActivityProgressTable(baseProps);
        const html = renderToStaticMarkup(element);

        expect(html).toContain("กิจกรรมช่วยเหลือนักเรียนกลุ่มสี");
        expect(html).toContain("activity-row");
        expect(html).not.toContain("ผลคัดกรองครั้งที่ 2 เป็นการประเมินปลายเทอม");
        expect(mocks.getActivityProgress).toHaveBeenCalledWith(
            "student-1",
            "phq-1",
        );
    });

    it("renders round 2 as a terminal assessment without loading activities", async () => {
        const element = await ActivityProgressTable({
            ...baseProps,
            assessmentPeriod: {
                ...baseProps.assessmentPeriod,
                assessmentRound: 2,
            },
        });
        const html = renderToStaticMarkup(element);

        expect(html).toContain(
            "ผลคัดกรองครั้งที่ 2 เป็นการประเมินปลายเทอม",
        );
        expect(html).toContain("ไม่มีชุดกิจกรรมต่อจากผลคัดกรองนี้");
        expect(html).not.toContain("กิจกรรมช่วยเหลือนักเรียนกลุ่มสี");
        expect(html).not.toContain("ยังไม่มีข้อมูลกิจกรรมสำหรับผลประเมินนี้");
        expect(mocks.getActivityProgress).not.toHaveBeenCalled();
    });
});

function createActivity() {
    return {
        id: "activity-1",
        studentId: "student-1",
        phqResultId: "phq-1",
        activityNumber: 1,
        status: "in_progress",
        worksheetUploads: [],
        scheduledDate: null,
        internalProblems: null,
        externalProblems: null,
        problemType: null,
        teacher: null,
    };
}
