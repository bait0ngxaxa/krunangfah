import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    getSchoolAdmins,
    togglePrimaryStatus,
} from "@/lib/actions/primary-admin.actions";

type MockSession = {
    user: {
        id: string;
        role: "school_admin";
        isPrimary: boolean;
        schoolId: string;
    };
};

type MockUser = {
    id: string;
    role: "school_admin" | "system_admin" | "class_teacher";
    schoolId: string | null;
    isPrimary: boolean;
    deletedAt: Date | null;
};

const mocks = vi.hoisted(() => ({
    requirePrimaryAdmin: vi.fn(),
    requireAuth: vi.fn(),
    userFindMany: vi.fn(),
    userFindUnique: vi.fn(),
    userUpdateMany: vi.fn(),
    revalidatePath: vi.fn(),
    invalidateUserSessionCaches: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
    requirePrimaryAdmin: mocks.requirePrimaryAdmin,
    requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        user: {
            findMany: mocks.userFindMany,
            findUnique: mocks.userFindUnique,
            updateMany: mocks.userUpdateMany,
        },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth/session-store", () => ({
    invalidateUserSessionCaches: mocks.invalidateUserSessionCaches,
}));

function createPrimaryAdminSession(): MockSession {
    return {
        user: {
            id: "primary-admin-1",
            role: "school_admin",
            isPrimary: true,
            schoolId: "school-1",
        },
    };
}

function createTargetAdmin(overrides: Partial<MockUser> = {}): MockUser {
    return {
        id: "target-admin-1",
        role: "school_admin",
        schoolId: "school-1",
        isPrimary: false,
        deletedAt: null,
        ...overrides,
    };
}

describe("togglePrimaryStatus", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.requirePrimaryAdmin.mockResolvedValue(createPrimaryAdminSession());
        mocks.requireAuth.mockResolvedValue(createPrimaryAdminSession());
        mocks.userFindMany.mockResolvedValue([]);
        mocks.userFindUnique.mockResolvedValue(createTargetAdmin());
        mocks.userUpdateMany.mockResolvedValue({ count: 1 });
        mocks.invalidateUserSessionCaches.mockResolvedValue(undefined);
    });

    it("invalidates target user session cache after toggling isPrimary", async () => {
        const result = await togglePrimaryStatus("target-admin-1");

        expect(result).toEqual({
            success: true,
            message: "เพิ่มสิทธิ์ Primary Admin สำเร็จ",
        });
        expect(mocks.userUpdateMany).toHaveBeenCalledWith({
            where: { id: "target-admin-1", deletedAt: null },
            data: { isPrimary: true },
        });
        expect(mocks.invalidateUserSessionCaches).toHaveBeenCalledWith(
            "target-admin-1",
        );
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/school/classes");
    });

    it("does not return closed accounts as Primary Admin candidates", async () => {
        await getSchoolAdmins();

        expect(mocks.userFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    schoolId: "school-1",
                    role: "school_admin",
                    deletedAt: null,
                },
            }),
        );
    });

    it("rejects assigning Primary Admin to a closed account", async () => {
        mocks.userFindUnique.mockResolvedValue(
            createTargetAdmin({ deletedAt: new Date("2026-07-10T00:00:00.000Z") }),
        );

        const result = await togglePrimaryStatus("target-admin-1");

        expect(result).toEqual({
            success: false,
            message: "ไม่สามารถเปลี่ยนสิทธิ์บัญชีที่ปิดใช้งานแล้ว",
        });
        expect(mocks.userUpdateMany).not.toHaveBeenCalled();
    });
});
