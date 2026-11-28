import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

const mocks = vi.hoisted(() => ({
    getSchools: vi.fn(),
    getStudentDashboardData: vi.fn(),
    getReferredOutStudents: vi.fn(),
    requireAuth: vi.fn(),
    redirect: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/actions/dashboard.actions", () => ({
    getSchools: mocks.getSchools,
}));
vi.mock("@/lib/actions/referral.actions", () => ({
    getReferredOutStudents: mocks.getReferredOutStudents,
}));
vi.mock("@/lib/actions/student/dashboard", () => ({
    getStudentDashboardData: mocks.getStudentDashboardData,
}));
vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: vi.fn() }),
    redirect: mocks.redirect,
}));

import StudentsPage from "@/app/(protected)/students/page";
import { buildImportedStudentsHref } from "@/components/student/import/completion";
import { StudentDashboard } from "@/components/student/dashboard/StudentDashboard";

const emptyDashboardData = {
    students: [],
    classes: [],
    classOptions: [],
    riskCounts: { red: 0, orange: 0, yellow: 0, green: 0, blue: 0 },
    referredCount: 0,
    totalStudents: 0,
    filteredStudentCount: 0,
    pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
    },
};

describe("Students page system admin access", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireAuth.mockResolvedValue({
            user: { role: "system_admin" },
        });
        mocks.getSchools.mockResolvedValue({
            status: "success",
            data: [{ id: "school-1", name: "โรงเรียนหนึ่ง" }],
        });
        mocks.getStudentDashboardData.mockResolvedValue({
            status: "empty",
            data: emptyDashboardData,
        });
    });

    it("loads the read-only dashboard so system admin can select a school", async () => {
        const page = await StudentsPage({ searchParams: Promise.resolve({}) });
        const suspense = page.props.children[1].props.children;
        const contentElement = suspense.props.children;
        const renderedContent = await contentElement.type(contentElement.props);

        expect(mocks.getStudentDashboardData).toHaveBeenCalledWith({
            schoolId: undefined,
            classFilter: undefined,
            page: 1,
            riskFilter: undefined,
            referredOnly: false,
        });
        expect(renderedContent).not.toBeNull();
        expect(renderedContent.props.readOnly).toBeUndefined();
        expect(renderedContent.props.userRole).toBe("system_admin");
    });

    it("renders the real empty state only when the dashboard query succeeds empty", async () => {
        mocks.requireAuth.mockResolvedValue({
            user: { role: "school_admin" },
        });

        const page = await StudentsPage({ searchParams: Promise.resolve({}) });
        const suspense = page.props.children[1].props.children;
        const contentElement = suspense.props.children;
        const renderedContent = await contentElement.type(contentElement.props);
        const html = renderToStaticMarkup(renderedContent);

        expect(html).toContain("ยังไม่มีข้อมูลนักเรียน");
    });

    it("renders the post-import link's term and round without redirecting", async () => {
        const academicYearId = "cm123456789012345678901234";
        const href = buildImportedStudentsHref({
            academicYearId,
            academicYearLabel: "2568/2",
            assessmentRound: 2,
            classNames: ["ม.1/1"],
        });
        const searchParams = Object.fromEntries(
            new URL(href, "http://localhost").searchParams,
        );
        mocks.requireAuth.mockResolvedValue({ user: { role: "school_admin" } });
        mocks.getStudentDashboardData.mockResolvedValue({
            status: "success",
            data: {
                ...emptyDashboardData,
                classes: ["ม.1/1"],
                classOptions: [{ name: "ม.1/1", count: 1 }],
                totalStudents: 1,
                currentAcademicYearId: null,
                availableTerms: [
                    { id: academicYearId, year: 2568, semester: 2, rounds: [2] },
                ],
                selectedTerm: { id: academicYearId, year: 2568, semester: 2 },
            },
        });

        const page = await StudentsPage({ searchParams: Promise.resolve(searchParams) });
        const suspense = page.props.children[1].props.children;
        const contentElement = suspense.props.children;
        const renderedContent = await contentElement.type(contentElement.props);

        expect(mocks.redirect).not.toHaveBeenCalled();
        expect(mocks.getStudentDashboardData).toHaveBeenCalledWith(
            expect.objectContaining({
                classFilter: "ม.1/1",
                academicYearId,
                assessmentRound: 2,
            }),
        );
        expect(renderedContent.props.filters).toEqual(
            expect.objectContaining({
                className: "ม.1/1",
                academicYearId,
                assessmentRound: 2,
            }),
        );
        expect(renderedContent.props.selectedTerm).toEqual({
            id: academicYearId,
            year: 2568,
            semester: 2,
        });
    });

    async function renderStudentsPage(searchParams: Record<string, string>) {
        const page = await StudentsPage({ searchParams: Promise.resolve(searchParams) });
        const suspense = page.props.children[1].props.children;
        const contentElement = suspense.props.children;
        return contentElement.type(contentElement.props);
    }

    it("passes unscreened=year to the dashboard in the default view", async () => {
        mocks.requireAuth.mockResolvedValue({ user: { role: "school_admin" } });

        const rendered = await renderStudentsPage({ unscreened: "year" });

        expect(mocks.getStudentDashboardData).toHaveBeenCalledWith(
            expect.objectContaining({ unscreenedThisYear: true }),
        );
        // An active filter is not the "no students yet" import state.
        expect(rendered.type).toBe(StudentDashboard);
    });

    it("treats unscreened=year&year=<id> as year=<id> only, and ignores other values", async () => {
        const academicYearId = "cm123456789012345678901234";
        mocks.requireAuth.mockResolvedValue({ user: { role: "school_admin" } });
        mocks.getStudentDashboardData.mockResolvedValue({
            status: "success",
            data: { ...emptyDashboardData, classes: ["ม.1/1"], totalStudents: 1 },
        });

        const rendered = await renderStudentsPage({
            unscreened: "year",
            year: academicYearId,
        });
        await renderStudentsPage({ unscreened: "yes" });

        const [withTerm, invalid] = mocks.getStudentDashboardData.mock.calls.map(
            (call) => call[0],
        );
        expect(withTerm).toEqual(expect.objectContaining({ academicYearId }));
        expect(withTerm).not.toHaveProperty("unscreenedThisYear");
        expect(invalid).not.toHaveProperty("unscreenedThisYear");
        expect(rendered.props.filters.unscreened).toBeUndefined();
        expect(rendered.props.filters.academicYearId).toBe(academicYearId);
    });

    it("renders request ID and never the empty-state copy on backend failure", async () => {
        mocks.getStudentDashboardData.mockResolvedValue({
            status: "transient_error",
            requestId: "student-request-1",
            message: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        });

        const page = await StudentsPage({ searchParams: Promise.resolve({}) });
        const suspense = page.props.children[1].props.children;
        const contentElement = suspense.props.children;
        const renderedContent = await contentElement.type(contentElement.props);

        expect(renderedContent.type).toBe(QueryErrorState);
        const html = renderToStaticMarkup(renderedContent);
        expect(html).toContain("student-request-1");
        expect(html).not.toContain("ยังไม่มีข้อมูลนักเรียน");
    });
});
