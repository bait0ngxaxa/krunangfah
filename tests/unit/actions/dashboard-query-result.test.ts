import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getRequiredSessionUser: vi.fn(),
    logError: vi.fn(),
    schoolCount: vi.fn(),
    schoolFindMany: vi.fn(),
    studentCount: vi.fn(),
    teacherFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/viewer-context", () => ({
    getRequiredSessionUser: mocks.getRequiredSessionUser,
}));
vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        school: {
            count: mocks.schoolCount,
            findMany: mocks.schoolFindMany,
        },
        student: { count: mocks.studentCount },
        teacher: { findUnique: mocks.teacherFindUnique },
    },
}));
vi.mock("next/cache", () => ({
    unstable_cache: vi.fn((callback: () => Promise<unknown>) => callback),
}));
vi.mock("@/lib/utils/logging", () => ({ logError: mocks.logError }));

const { getDashboardData, getSchools } = await import(
    "@/lib/actions/dashboard.actions"
);

describe("dashboard query results", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getRequiredSessionUser.mockResolvedValue({
            userId: "admin-1",
            role: "system_admin",
            isPrimary: false,
        });
        mocks.studentCount.mockResolvedValue(0);
        mocks.schoolCount.mockResolvedValue(0);
        mocks.schoolFindMany.mockResolvedValue([]);
    });

    it("keeps legitimate zero metrics as successful dashboard data", async () => {
        await expect(getDashboardData()).resolves.toEqual({
            status: "success",
            data: {
                teacher: null,
                studentCount: 0,
                schoolCount: 0,
            },
        });
    });

    it("returns transient_error instead of fake zero metrics when a count fails", async () => {
        mocks.studentCount.mockRejectedValue(new Error("database unavailable"));

        const result = await getDashboardData();

        expect(result).toEqual({
            status: "transient_error",
            requestId: expect.any(String),
            message: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        });
        expect(result).not.toHaveProperty("data");
    });

    it("distinguishes an empty school list from a school query failure", async () => {
        await expect(getSchools()).resolves.toEqual({
            status: "empty",
            data: [],
        });

        mocks.schoolFindMany.mockRejectedValue(new Error("database unavailable"));
        const failed = await getSchools();

        expect(failed.status).toBe("transient_error");
        expect(failed).not.toHaveProperty("data");
    });
});
