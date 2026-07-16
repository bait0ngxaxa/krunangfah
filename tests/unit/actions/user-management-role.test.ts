import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireAdmin: vi.fn(),
    requireAuth: vi.fn(),
    userFindUnique: vi.fn(),
    userUpdate: vi.fn(),
    userUpdateMany: vi.fn(),
    userCount: vi.fn(),
    teacherFindUnique: vi.fn(),
    teacherUpdate: vi.fn(),
    teacherUpdateMany: vi.fn(),
    schoolClassFindFirst: vi.fn(),
    systemAdminEventCreate: vi.fn(),
    invalidateUserSessionCaches: vi.fn(),
    transaction: vi.fn(),
    deleteUserSessionCaches: vi.fn(),
    revalidateDashboardCache: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
    requireAdmin: mocks.requireAdmin,
    requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        user: {
            findUnique: mocks.userFindUnique,
            update: mocks.userUpdate,
            updateMany: mocks.userUpdateMany,
            count: mocks.userCount,
        },
        teacher: {
            findUnique: mocks.teacherFindUnique,
            update: mocks.teacherUpdate,
            updateMany: mocks.teacherUpdateMany,
        },
        schoolClass: {
            findFirst: mocks.schoolClassFindFirst,
        },
        systemAdminEvent: {
            create: mocks.systemAdminEventCreate,
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

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session-store", () => ({
    invalidateUserSessionCaches: mocks.invalidateUserSessionCaches,
}));

vi.mock("@/lib/actions/system-admin/events", () => ({
    createSystemAdminEditEvent: mocks.systemAdminEventCreate,
}));

const {
    changeUserRole,
    updateTeacherProfile,
} = await import("@/lib/actions/user-management.actions");

type StaffState = {
    role: "school_admin" | "class_teacher";
    isPrimary: boolean;
    advisoryClass: string;
};

type UserLookup = { where: { id: string } };
type TeacherLookup = { where: { userId: string } };
type UserMutation = {
    where: { id: string };
    data: { role: StaffState["role"]; isPrimary: boolean };
};
type TeacherMutation = {
    where: { userId: string };
    data: { advisoryClass: string };
};

function createSystemAdminSession() {
    return {
        user: {
            id: "system-admin-1",
            email: "admin@example.com",
            name: "ผู้ดูแลระบบ",
            role: "system_admin" as const,
            isPrimary: false,
            schoolId: null,
        },
    };
}

function configureConcurrentPrimaryState(): Map<string, StaffState> {
    const state = new Map<string, StaffState>([
        [
            "primary-admin-1",
            { role: "school_admin", isPrimary: true, advisoryClass: "ทุกห้อง" },
        ],
        [
            "primary-admin-2",
            { role: "school_admin", isPrimary: true, advisoryClass: "ทุกห้อง" },
        ],
    ]);

    mocks.userFindUnique.mockImplementation(({ where }: UserLookup) => {
        const current = state.get(where.id);
        if (!current) return Promise.resolve(null);
        return Promise.resolve({
            id: where.id,
            email: `${where.id}@example.com`,
            name: where.id,
            role: current.role,
            isPrimary: current.isPrimary,
            schoolId: "school-1",
            deletedAt: null,
            updatedAt: new Date("2026-07-16T00:00:00.000Z"),
            teacher: {
                id: `teacher-${where.id}`,
                firstName: "ครู",
                lastName: where.id,
                advisoryClass: current.advisoryClass,
                updatedAt: new Date("2026-07-16T00:00:00.000Z"),
            },
        });
    });
    mocks.teacherFindUnique.mockImplementation(({ where }: TeacherLookup) => {
        const current = state.get(where.userId);
        if (!current) return Promise.resolve(null);
        return Promise.resolve({
            id: `teacher-${where.userId}`,
            firstName: "ครู",
            lastName: where.userId,
            advisoryClass: current.advisoryClass,
            updatedAt: new Date("2026-07-16T00:00:00.000Z"),
            user: {
                id: where.userId,
                email: `${where.userId}@example.com`,
                name: where.userId,
                role: current.role,
                isPrimary: current.isPrimary,
                schoolId: "school-1",
                deletedAt: null,
            },
        });
    });
    mocks.userCount.mockImplementation(() =>
        Promise.resolve(
            [...state.values()].filter((user) => user.isPrimary).length,
        ),
    );
    mocks.userUpdate.mockImplementation(({ where, data }: UserMutation) => {
        const current = state.get(where.id);
        if (current) {
            current.role = data.role;
            current.isPrimary = data.isPrimary;
        }
        return Promise.resolve({});
    });
    mocks.userUpdateMany.mockImplementation(({ where, data }: UserMutation) => {
        const current = state.get(where.id);
        if (!current || current.role !== "school_admin" || !current.isPrimary) {
            return Promise.resolve({ count: 0 });
        }
        current.role = data.role;
        current.isPrimary = data.isPrimary;
        return Promise.resolve({ count: 1 });
    });
    mocks.teacherUpdate.mockImplementation(({ where, data }: TeacherMutation) => {
        const current = state.get(where.userId);
        if (current) current.advisoryClass = data.advisoryClass;
        return Promise.resolve({});
    });
    mocks.teacherUpdateMany.mockImplementation(({ where, data }: TeacherMutation) => {
        const current = state.get(where.userId);
        if (!current || current.advisoryClass !== "ทุกห้อง") {
            return Promise.resolve({ count: 0 });
        }
        current.advisoryClass = data.advisoryClass;
        return Promise.resolve({ count: 1 });
    });
    mocks.schoolClassFindFirst.mockResolvedValue({ id: "class-1" });
    return state;
}

describe("changeUserRole primary assignment", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.requireAdmin.mockResolvedValue({
            user: createSystemAdminSession().user,
        });
        mocks.requireAuth.mockResolvedValue(createSystemAdminSession());
        mocks.userFindUnique.mockResolvedValue({
            id: "class-teacher-1",
            role: "class_teacher",
            isPrimary: false,
            schoolId: "school-1",
            deletedAt: null,
            teacher: { id: "teacher-1", advisoryClass: "ม.1/1" },
        });
        mocks.userUpdate.mockResolvedValue({});
        mocks.userUpdateMany.mockResolvedValue({ count: 1 });
        mocks.userCount.mockResolvedValue(2);
        mocks.teacherFindUnique.mockResolvedValue(null);
        mocks.teacherUpdate.mockResolvedValue({});
        mocks.teacherUpdateMany.mockResolvedValue({ count: 1 });
        mocks.schoolClassFindFirst.mockResolvedValue({ id: "class-1" });
        mocks.systemAdminEventCreate.mockResolvedValue({});
        mocks.invalidateUserSessionCaches.mockResolvedValue(undefined);
        let serialized = Promise.resolve();
        const transactionClient = {
            user: {
                findUnique: mocks.userFindUnique,
                updateMany: mocks.userUpdateMany,
                count: mocks.userCount,
            },
            teacher: {
                findUnique: mocks.teacherFindUnique,
                updateMany: mocks.teacherUpdateMany,
            },
            schoolClass: { findFirst: mocks.schoolClassFindFirst },
            systemAdminEvent: { create: mocks.systemAdminEventCreate },
        };
        mocks.transaction.mockImplementation((operation: unknown) => {
            const run = serialized.then(async () => {
                if (typeof operation === "function") {
                    return operation(transactionClient);
                }
                if (Array.isArray(operation)) return Promise.all(operation);
                throw new Error("Unexpected transaction shape");
            });
            serialized = run.then(() => undefined);
            return run;
        });
    });

    it("rejects promoting class_teacher directly to primary school admin", async () => {
        const result = await changeUserRole(
            "class-teacher-1",
            "primary_school_admin",
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain("เฉพาะ school_admin");
        expect(mocks.transaction).toHaveBeenCalledOnce();
        expect(mocks.userUpdate).not.toHaveBeenCalled();
        expect(mocks.teacherUpdate).not.toHaveBeenCalled();
    });

    it("keeps one Primary Admin when System Admin demotes two concurrently", async () => {
        const state = configureConcurrentPrimaryState();

        const results = await Promise.all([
            changeUserRole("primary-admin-1", "angel_teacher"),
            changeUserRole("primary-admin-2", "angel_teacher"),
        ]);

        expect(results.filter((result) => result.success)).toHaveLength(1);
        expect([...state.values()].filter((user) => user.isPrimary)).toHaveLength(1);
    });

    it("keeps one Primary Admin when advisory classes change concurrently", async () => {
        const state = configureConcurrentPrimaryState();

        const results = await Promise.all([
            updateTeacherProfile("primary-admin-1", { advisoryClass: "ม.1/1" }),
            updateTeacherProfile("primary-admin-2", { advisoryClass: "ม.1/2" }),
        ]);

        expect(results.filter((result) => result.success)).toHaveLength(1);
        expect([...state.values()].filter((user) => user.isPrimary)).toHaveLength(1);
    });
});
