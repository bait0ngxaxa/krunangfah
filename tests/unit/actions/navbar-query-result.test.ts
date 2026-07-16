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

    it("does not hide navigation when the student count query fails", async () => {
        mocks.studentCount.mockRejectedValue(new Error("database unavailable"));

        const result = await hasStudents();

        expect(result).toEqual({
            status: "transient_error",
            requestId: expect.any(String),
        });
    });
});
