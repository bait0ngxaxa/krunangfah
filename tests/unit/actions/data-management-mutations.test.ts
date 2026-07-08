import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        school: { findUnique: vi.fn(), update: vi.fn() },
        student: { findUnique: vi.fn(), update: vi.fn() },
        user: { findMany: vi.fn() },
        teacherInvite: { deleteMany: vi.fn() },
        schoolAdminInvite: { deleteMany: vi.fn() },
        dataManagementEvent: { create: vi.fn() },
    };
    return {
        transaction: vi.fn(),
        studentFindUnique: vi.fn(),
        tx,
    };
});

const cacheMocks = vi.hoisted(() => ({
    invalidateUserSessionCaches: vi.fn(),
    revalidateAnalyticsCache: vi.fn(),
    revalidateDashboardCache: vi.fn(),
    revalidatePath: vi.fn(),
    revalidateStudentsCache: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        $transaction: prismaMocks.transaction,
        student: { findUnique: prismaMocks.studentFindUnique },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: cacheMocks.revalidatePath,
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: cacheMocks.revalidateAnalyticsCache,
}));

vi.mock("@/lib/actions/dashboard/cache", () => ({
    revalidateDashboardCache: cacheMocks.revalidateDashboardCache,
}));

vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: cacheMocks.revalidateStudentsCache,
}));

vi.mock("@/lib/auth/session-store", () => ({
    invalidateUserSessionCaches: cacheMocks.invalidateUserSessionCaches,
}));

vi.mock("@/lib/actions/data-management/preview", () => ({
    getSchoolImpact: vi.fn(),
    getStudentImpact: vi.fn(),
}));

import {
    disableSchool,
    disableStudent,
} from "@/lib/actions/data-management/mutations";

const input = {
    id: "cmtarget000000000000001",
    reason: "ตรวจสอบข้อมูลผิด",
    actor: {
        id: "cmadmin00000000000000001",
        email: "admin@example.com",
        name: "ผู้ดูแลระบบ",
        role: "system_admin",
    },
};

describe("data management mutations", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.transaction.mockImplementation(
            async (callback: (tx: typeof prismaMocks.tx) => Promise<unknown>) =>
                callback(prismaMocks.tx),
        );
    });

    it("does not invalidate school caches when disable school finds no target", async () => {
        prismaMocks.tx.school.findUnique.mockResolvedValue(null);

        const result = await disableSchool(input);

        expect(result).toEqual({ success: false, message: "ไม่พบโรงเรียน" });
        expect(cacheMocks.invalidateUserSessionCaches).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateDashboardCache).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateStudentsCache).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateAnalyticsCache).not.toHaveBeenCalled();
        expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("does not invalidate student caches when disable student finds no target", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(null);

        const result = await disableStudent(input);

        expect(result).toEqual({ success: false, message: "ไม่พบนักเรียน" });
        expect(prismaMocks.studentFindUnique).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateDashboardCache).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateStudentsCache).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateAnalyticsCache).not.toHaveBeenCalled();
        expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
    });
});
