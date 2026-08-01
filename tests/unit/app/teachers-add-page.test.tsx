import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

const mocks = vi.hoisted(() => ({
    requireAuth: vi.fn(),
    getSchoolClasses: vi.fn(),
    getCurrentAcademicYearTerms: vi.fn(),
    getSchoolRoster: vi.fn(),
    getMyTeacherInvites: vi.fn(),
    redirect: vi.fn((path: string): never => {
        throw new Error(`REDIRECT:${path}`);
    }),
}));

vi.mock("next/navigation", () => ({
    redirect: mocks.redirect,
    useRouter: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/actions/school-setup.actions", () => ({
    getSchoolClasses: mocks.getSchoolClasses,
}));
vi.mock("@/lib/actions/academic-year.actions", () => ({
    getCurrentAcademicYearTerms: mocks.getCurrentAcademicYearTerms,
}));
vi.mock("@/lib/actions/teacher-roster.actions", () => ({
    getSchoolRoster: mocks.getSchoolRoster,
}));
vi.mock("@/lib/actions/teacher-invite", () => ({
    getMyTeacherInvites: mocks.getMyTeacherInvites,
}));
vi.mock("@/components/teacher/TeacherSetupTabs", () => ({
    TeacherSetupTabs: () => <div data-testid="teacher-setup-tabs" />,
}));

import AddTeacherPage from "@/app/(protected)/teachers/add/page";

describe("AddTeacherPage query policy", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireAuth.mockResolvedValue({
            user: {
                id: "admin-1",
                role: "school_admin",
                isPrimary: true,
                schoolId: "school-1",
            },
        });
        mocks.getSchoolClasses.mockResolvedValue({
            status: "empty",
            data: [],
        });
        mocks.getCurrentAcademicYearTerms.mockResolvedValue({
            status: "success",
            data: [{ id: "year-1", year: 2569, semester: 1 }],
        });
        mocks.getSchoolRoster.mockResolvedValue({ status: "empty", data: [] });
        mocks.getMyTeacherInvites.mockResolvedValue({
            status: "empty",
            data: [],
        });
    });

    it("renders management tabs when every query is success or empty", async () => {
        const page = await AddTeacherPage();
        const html = renderToStaticMarkup(page);

        expect(html).toContain("data-testid=\"teacher-setup-tabs\"");
    });

    it.each([
        ["classes", "classes-request", "getSchoolClasses"],
        ["academic years", "years-request", "getCurrentAcademicYearTerms"],
        ["roster", "roster-request", "getSchoolRoster"],
        ["invites", "invites-request", "getMyTeacherInvites"],
    ] as const)(
        "renders QueryErrorState and no tabs when %s fails",
        async (_label, requestId, queryName) => {
            mocks[queryName].mockResolvedValue({
                status: "transient_error",
                requestId,
            });

            const page = await AddTeacherPage();

            expect(page.type).toBe(QueryErrorState);
            expect(page.props.requestId).toBe(requestId);
            expect(page.type).not.toBe("teacher-setup-tabs");
        },
    );

    it("does not render management tabs for a forbidden core query", async () => {
        mocks.getSchoolRoster.mockResolvedValue({ status: "forbidden" });

        await expect(AddTeacherPage()).rejects.toThrow("REDIRECT:/dashboard");
    });
});
