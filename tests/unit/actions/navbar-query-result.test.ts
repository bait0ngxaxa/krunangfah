import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    userFindUnique: vi.fn(),
    studentCount: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        user: { findUnique: mocks.userFindUnique },
        student: { count: mocks.studentCount },
    },
}));
vi.mock("@/lib/utils/logging", () => ({ logError: vi.fn() }));

const { hasStudents } = await import("@/lib/actions/navbar.actions");

describe("navbar student query result", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({ user: { id: "teacher-1" } });
        mocks.userFindUnique.mockResolvedValue({
            schoolId: "school-1",
            role: "class_teacher",
            teacher: { advisoryClass: "ม.1/1" },
        });
    });

    it("uses the shared active student scope for class teachers", async () => {
        mocks.studentCount.mockResolvedValue(1);

        const result = await hasStudents();

        expect(result).toEqual({ status: "success", data: true });
        expect(mocks.studentCount).toHaveBeenCalledWith({
            where: {
                schoolId: "school-1",
                disabledAt: null,
                isTestData: false,
                school: { disabledAt: null, isTestData: false },
                class: "ม.1/1",
            },
        });
    });

    it("excludes disabled and test schools for school admins", async () => {
        mocks.userFindUnique.mockResolvedValue({
            schoolId: "school-1",
            role: "school_admin",
            teacher: null,
        });
        mocks.studentCount.mockResolvedValue(1);

        await hasStudents();

        expect(mocks.studentCount).toHaveBeenCalledWith({
            where: {
                schoolId: "school-1",
                disabledAt: null,
                isTestData: false,
                school: { disabledAt: null, isTestData: false },
            },
        });
    });

    it("does not count students outside a non-admin school scope", async () => {
        mocks.userFindUnique.mockResolvedValue({
            schoolId: null,
            role: "school_admin",
            teacher: null,
        });

        const result = await hasStudents();

        expect(result).toEqual({ status: "empty", data: false });
        expect(mocks.studentCount).not.toHaveBeenCalled();
    });

    it("does not hide navigation when the student count query fails", async () => {
        mocks.studentCount.mockRejectedValue(new Error("database unavailable"));

        const result = await hasStudents();

        expect(result).toEqual({
            status: "transient_error",
            requestId: expect.any(String),
        });
    });
});
