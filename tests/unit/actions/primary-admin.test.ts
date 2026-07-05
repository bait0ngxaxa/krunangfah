import { beforeEach, describe, expect, it, vi } from "vitest";
import { togglePrimaryStatus } from "@/lib/actions/primary-admin.actions";

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
};

const mocks = vi.hoisted(() => ({
    requirePrimaryAdmin: vi.fn(),
    requireAuth: vi.fn(),
    userFindUnique: vi.fn(),
    userUpdate: vi.fn(),
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
            findUnique: mocks.userFindUnique,
            update: mocks.userUpdate,
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
        ...overrides,
    };
}

describe("togglePrimaryStatus", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.requirePrimaryAdmin.mockResolvedValue(createPrimaryAdminSession());
        mocks.userFindUnique.mockResolvedValue(createTargetAdmin());
        mocks.userUpdate.mockResolvedValue(createTargetAdmin({ isPrimary: true }));
        mocks.invalidateUserSessionCaches.mockResolvedValue(undefined);
    });

    it("invalidates target user session cache after toggling isPrimary", async () => {
        const result = await togglePrimaryStatus("target-admin-1");

        expect(result).toEqual({
            success: true,
            message: "เพิ่มสิทธิ์ Primary Admin สำเร็จ",
        });
        expect(mocks.userUpdate).toHaveBeenCalledWith({
            where: { id: "target-admin-1" },
            data: { isPrimary: true },
        });
        expect(mocks.invalidateUserSessionCaches).toHaveBeenCalledWith(
            "target-admin-1",
        );
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/school/classes");
    });
});
