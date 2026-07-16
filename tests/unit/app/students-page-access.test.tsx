import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getSchools: vi.fn(),
    getStudentDashboardData: vi.fn(),
    getReferredOutStudents: vi.fn(),
    requireAuth: vi.fn(),
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

import StudentsPage from "@/app/(protected)/students/page";

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
        mocks.getSchools.mockResolvedValue([{ id: "school-1", name: "โรงเรียนหนึ่ง" }]);
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
});
