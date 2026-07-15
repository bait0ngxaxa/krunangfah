import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/actions/system-admin/mutations";
import { updateSystemSchool } from "@/lib/actions/system-admin/mutations";

const mocks = vi.hoisted(() => {
    const tx = {
        school: { updateMany: vi.fn(), findUnique: vi.fn() },
        systemAdminEvent: { create: vi.fn() },
    };
    return { transaction: vi.fn(), schoolFindUnique: vi.fn(), tx };
});

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        $transaction: mocks.transaction,
        school: { findUnique: mocks.schoolFindUnique },
    },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/actions/dashboard/cache", () => ({
    revalidateDashboardCache: vi.fn(),
}));

const actor: Actor = {
    id: "admin-1",
    email: "admin@example.com",
    name: "ผู้ดูแลระบบ",
    role: "system_admin",
};

const school = {
    id: "cmschool0000000000000001",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    name: "โรงเรียนเดิม",
    province: "เชียงใหม่",
    disabledAt: null,
    isTestData: false,
    _count: { users: 2, students: 30 },
};

describe("updateSystemSchool", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.schoolFindUnique.mockResolvedValue(school);
        mocks.tx.school.updateMany.mockResolvedValue({ count: 1 });
        mocks.tx.school.findUnique.mockResolvedValue({
            ...school,
            name: "โรงเรียนใหม่",
        });
        mocks.transaction.mockImplementation(
            async (callback: (tx: typeof mocks.tx) => Promise<unknown>) =>
                callback(mocks.tx),
        );
    });

    it("returns a conflict when the school was updated after the form loaded", async () => {
        mocks.tx.school.updateMany.mockResolvedValue({ count: 0 });

        const result = await updateSystemSchool(
            {
                id: school.id,
                expectedUpdatedAt: school.updatedAt,
                name: "โรงเรียนใหม่",
                province: "เชียงใหม่",
                reason: "แก้ชื่อโรงเรียน",
            },
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "ข้อมูลโรงเรียนถูกแก้ไขโดยผู้ใช้อื่น กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่",
        });
        expect(mocks.tx.school.updateMany).toHaveBeenCalledWith({
            where: { id: school.id, updatedAt: school.updatedAt },
            data: { name: "โรงเรียนใหม่", province: "เชียงใหม่" },
        });
        expect(mocks.tx.systemAdminEvent.create).not.toHaveBeenCalled();
    });
});
