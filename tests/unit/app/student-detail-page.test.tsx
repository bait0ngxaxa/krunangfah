import { Children, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getStudentDetailResult: vi.fn(),
    getCounselingSessions: vi.fn(),
    getHomeVisits: vi.fn(),
    requireAuth: vi.fn(),
    renderProfile: vi.fn(),
    redirect: vi.fn(),
}));

vi.mock("@/lib/actions/student/main", () => ({
    getStudentDetailResult: mocks.getStudentDetailResult,
}));
vi.mock("@/lib/actions/counseling.actions", () => ({
    getCounselingSessions: mocks.getCounselingSessions,
}));
vi.mock("@/lib/actions/home-visit.actions", () => ({
    getHomeVisits: mocks.getHomeVisits,
}));
vi.mock("@/lib/auth/session", () => ({
    requireAuth: mocks.requireAuth,
}));
vi.mock("next/navigation", () => ({
    notFound: vi.fn(),
    redirect: mocks.redirect,
}));
vi.mock("next/dynamic", () => ({
    default: () => () => null,
}));

vi.mock("@/components/ui/BackButton", () => ({
    BackButton: () => null,
}));
vi.mock("@/components/ui/QueryErrorState", () => ({
    QueryErrorState: () => <div>query-error</div>,
}));
vi.mock("@/components/ui/Skeleton", () => ({
    Skeleton: () => <div>skeleton</div>,
}));
vi.mock("@/components/ui/Tabs", () => ({
    Tabs: ({ tabs }: { tabs: Array<{ id: string; label: ReactNode; content: ReactNode }> }) => (
        <div data-testid="student-detail-tabs">
            {tabs.map((tab) => (
                <section key={tab.id} data-tab-id={tab.id}>
                    <div data-tab-label={tab.id}>{tab.label}</div>
                    <div>{tab.content}</div>
                </section>
            ))}
        </div>
    ),
}));
vi.mock("@/components/student/profile/StudentProfileSection", () => ({
    StudentProfileSection: (props: unknown) => {
        mocks.renderProfile(props);
        return <div data-testid="student-profile" />;
    },
}));
vi.mock("@/components/student/profile/StudentStatusContext", () => ({
    StudentStatusProvider: ({ children }: { children: ReactNode }) => (
        <>{children}</>
    ),
}));
vi.mock("@/components/student/profile/StudentDetailScrollTop", () => ({
    StudentDetailScrollTop: () => null,
}));
vi.mock("@/components/student/profile/AcademicYearFilter", () => ({
    AcademicYearFilter: () => null,
}));
vi.mock("@/components/student/profile/AssessmentRoundFilter", () => ({
    AssessmentRoundFilter: () => null,
}));
vi.mock("@/components/student/phq/PHQHistoryTable", () => ({
    PHQHistoryTable: () => <div data-testid="phq-history" />,
}));
vi.mock("@/components/student/phq/PHQTrendChart", () => ({
    PHQTrendChart: () => null,
}));
vi.mock("@/components/student/activity/ActivityProgressTable", () => ({
    ActivityProgressTable: ({
        assessmentPeriod,
        readOnly,
    }: {
        assessmentPeriod: { assessmentRound: number };
        readOnly?: boolean;
    }) => (
        <div
            data-testid="activity-progress"
            data-round={assessmentPeriod.assessmentRound}
            data-read-only={String(readOnly)}
        >
            {assessmentPeriod.assessmentRound === 2
                ? "round-2-terminal"
                : "round-1-activity-workflow"}
        </div>
    ),
}));
vi.mock("@/components/student/counseling/CounselingLogTable", () => ({
    CounselingLogTable: () => (
        <div data-testid="counseling-records">counseling-history</div>
    ),
}));
vi.mock("@/components/student/home-visit/HomeVisitTab", () => ({
    HomeVisitTab: () => <div data-testid="home-visit-records">home-visit</div>,
}));

import StudentDetailPage from "@/app/(protected)/students/[id]/page";

const academicYear = {
    id: "academic-year-1",
    year: 2569,
    semester: 1,
    startDate: new Date("2026-05-01"),
    endDate: new Date("2026-10-31"),
};

const student = {
    id: "student-1",
    firstName: "สมชาย",
    lastName: "ทดสอบ",
    studentId: "001",
    nationalId: null,
    gender: null,
    age: 13,
    class: "ม.1/1",
    status: "ACTIVE",
    school: { name: "โรงเรียนทดสอบ" },
    referral: null,
    referralHistory: [],
    phqResults: [
        {
            id: "phq-round-2",
            totalScore: 15,
            riskLevel: "yellow",
            referredToHospital: false,
            hospitalName: null,
            createdAt: new Date("2026-06-24T08:00:00.000Z"),
            assessmentRound: 2,
            academicYear,
        },
        {
            id: "phq-round-1",
            totalScore: 12,
            riskLevel: "green",
            referredToHospital: false,
            hospitalName: null,
            createdAt: new Date("2026-05-24T08:00:00.000Z"),
            assessmentRound: 1,
            academicYear,
        },
    ],
};

describe("Student detail care presentation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.redirect.mockImplementation((url: string) => {
            throw new Error(url);
        });
        mocks.requireAuth.mockResolvedValue({
            user: {
                id: "teacher-1",
                role: "class_teacher",
                schoolId: "school-1",
            },
        });
        mocks.getStudentDetailResult.mockResolvedValue({
            status: "success",
            data: student,
        });
        mocks.getCounselingSessions.mockResolvedValue({
            status: "success",
            data: {
                sessions: [],
                pagination: {
                    page: 1,
                    pageSize: 10,
                    total: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
            },
        });
        mocks.getHomeVisits.mockResolvedValue({
            status: "success",
            data: {
                visits: [],
                pagination: {
                    page: 1,
                    pageSize: 5,
                    total: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
            },
        });
    });

    it("uses round 2 care wording and keeps counseling and home visits visible", async () => {
        const html = await renderStudentDetail();

        expect(html).toContain("บันทึกการพูดคุย");
        expect(html).not.toContain("กิจกรรมและบันทึกการพูดคุย");
        expect(html).toContain("round-2-terminal");
        expect(html).toContain("data-testid=\"counseling-records\"");
        expect(html).toContain("data-testid=\"home-visit-records\"");
    });

    it.each(["class_teacher", "school_admin", "system_admin"])("never serializes a raw identifier to profile props for %s", async (role) => {
        const nationalId = "G1234567890123";
        mocks.requireAuth.mockResolvedValue({ user: { id: "user-1", role } });
        mocks.getStudentDetailResult.mockResolvedValue({ status: "success", data: { ...student, nationalId } });
        await renderStudentDetail();
        const props = mocks.renderProfile.mock.lastCall?.[0];
        expect(props).toBeDefined();
        expect(props.student).not.toHaveProperty("nationalId");
        expect(JSON.stringify(props)).not.toContain(nationalId);
    });

    it("redirects invalid year and round filters, keeping the tab and other context", async () => {
        await expect(renderStudentDetail({
            year: "unknown",
            round: "2",
            school: "school-1",
            tab: "activities",
            counselingPage: "2",
        })).rejects.toThrow("/students/student-1?school=school-1&tab=activities&counselingPage=2");
        expect(mocks.getCounselingSessions).not.toHaveBeenCalled();
        expect(mocks.getHomeVisits).not.toHaveBeenCalled();
    });

    it.each([
        [academicYear.id, academicYear.id],
        [`year:${academicYear.year}`, undefined],
    ])("keeps rendering a valid academic selection %s", async (year, expectedTermId) => {
        const html = await renderStudentDetail({ year, round: "1" });

        expect(mocks.redirect).not.toHaveBeenCalled();
        expect(html).toContain("round-1-activity-workflow");
        expect(html).toContain("counseling-history");
        const [, filter] = mocks.getCounselingSessions.mock.calls[0];
        expect(filter.academicYearId).toBe(expectedTermId);
        expect(filter.dateRange).toEqual({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
        });
    });

    it("keeps the round 1 activity wording and historical activity view read-only", async () => {
        const html = await renderStudentDetail({ round: "1" });

        expect(html).toContain("กิจกรรมและบันทึกการพูดคุย");
        expect(html).toContain("round-1-activity-workflow");
        expect(html).toContain('data-round="1"');
        expect(html).toContain('data-read-only="true"');
        expect(html).toContain("counseling-history");
    });
});

async function renderStudentDetail(searchParams: Record<string, string> = {}) {
    const page = await StudentDetailPage({
        params: Promise.resolve({ id: "student-1" }),
        searchParams: Promise.resolve(searchParams),
    });
    const pageChildren = Children.toArray(page.props.children);
    const detailContainer = pageChildren[1] as ReactElement<{
        children: ReactNode;
    }>;
    const detailChildren = Children.toArray(detailContainer.props.children);
    const suspense = detailChildren[2] as ReactElement<{
        children: ReactNode;
    }>;
    const contentElement = suspense.props.children as ReactElement<
        Record<string, unknown>
    >;
    const contentRenderer = contentElement.type as (
        props: Record<string, unknown>,
    ) => Promise<ReactNode>;
    const renderedContent = await contentRenderer(
        contentElement.props as Record<string, unknown>,
    );

    return renderToStaticMarkup(renderedContent);
}
