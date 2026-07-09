import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireAdmin: vi.fn(),
    userFindUnique: vi.fn(),
    userUpdate: vi.fn(),
    userCount: vi.fn(),
    teacherUpdate: vi.fn(),
    transaction: vi.fn(),
    deleteUserSessionCaches: vi.fn(),
    revalidateDashboardCache: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
    requireAdmin: mocks.requireAdmin,
    requireAuth: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        user: {
            findUnique: mocks.userFindUnique,
            update: mocks.userUpdate,
            count: mocks.userCount,
        },
        teacher: {
            update: mocks.teacherUpdate,
        },
        $transaction: mocks.transaction,
    },
}));

vi.mock("@/lib/auth/session-cache", () => ({
    deleteUserSessionCaches: mocks.deleteUserSessionCaches,
}));

vi.mock("@/lib/actions/dashboard/cache", () => ({
    revalidateDashboardCache: mocks.revalidateDashboardCache,
}));

const { changeUserRole } = await import("@/lib/actions/user-management.actions");

describe("changeUserRole primary assignment", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.requireAdmin.mockResolvedValue({
            user: {
                id: "system-admin-1",
                role: "system_admin",
                isPrimary: false,
                schoolId: null,
            },
        });
        mocks.userFindUnique.mockResolvedValue({
            id: "class-teacher-1",
            role: "class_teacher",
            isPrimary: false,
            schoolId: "school-1",
            deletedAt: null,
            teacher: { id: "teacher-1", advisoryClass: "ม.1/1" },
        });
    });

    it("rejects promoting class_teacher directly to primary school admin", async () => {
        const result = await changeUserRole(
            "class-teacher-1",
            "primary_school_admin",
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain("เฉพาะ school_admin");
        expect(mocks.transaction).not.toHaveBeenCalled();
        expect(mocks.userUpdate).not.toHaveBeenCalled();
        expect(mocks.teacherUpdate).not.toHaveBeenCalled();
    });
});
