import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/actions/system-admin/mutations";
import { updateSystemTeacherProfile } from "@/lib/actions/system-admin/staff-mutations";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        teacher: { update: vi.fn() },
        systemAdminEvent: { create: vi.fn() },
    };
    return {
        transaction: vi.fn(),
        teacherFindUnique: vi.fn(),
        tx,
    };
});

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        $transaction: prismaMocks.transaction,
        teacher: { findUnique: prismaMocks.teacherFindUnique },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/actions/dashboard/cache", () => ({
    revalidateDashboardCache: vi.fn(),
}));

const actor: Actor = {
    id: "admin-1",
    email: "admin@example.com",
    name: "ผู้ดูแลระบบ",
    role: "system_admin",
};

describe("updateSystemTeacherProfile", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.transaction.mockImplementation(
            async (callback: (tx: typeof prismaMocks.tx) => Promise<unknown>) =>
                callback(prismaMocks.tx),
        );
        prismaMocks.teacherFindUnique.mockResolvedValue(createTeacherRow());
        prismaMocks.tx.teacher.update.mockResolvedValue(
            createTeacherRow({
                firstName: "สมพร",
                schoolRole: "หัวหน้างานแนะแนว",
                projectRole: "lead",
            }),
        );
    });

    it("updates general teacher profile fields and records an audit event", async () => {
        const result = await updateSystemTeacherProfile(
            {
                id: "cmuser000000000000000001",
                firstName: "สมพร",
                lastName: "ใจดี",
                age: 42,
                schoolRole: "หัวหน้างานแนะแนว",
                projectRole: "lead",
                reason: "แก้ข้อมูลครูจากเอกสารโรงเรียน",
            },
            actor,
        );

        expect(result.success).toBe(true);
        expect(result.updated?.firstName).toBe("สมพร");
        expect(prismaMocks.tx.teacher.update).toHaveBeenCalledWith({
            where: { userId: "cmuser000000000000000001" },
            data: {
                firstName: "สมพร",
                lastName: "ใจดี",
                age: 42,
                schoolRole: "หัวหน้างานแนะแนว",
                projectRole: "lead",
            },
            select: expect.any(Object),
        });
        expect(prismaMocks.tx.systemAdminEvent.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                targetType: "teacher",
                targetId: "cmteacher00000000000001",
                reason: "แก้ข้อมูลครูจากเอกสารโรงเรียน",
                actorUserId: "admin-1",
                actorSnapshot: expect.objectContaining({
                    email: "admin@example.com",
                }),
            }),
        });
    });

    it("does not update when the profile data is unchanged", async () => {
        const result = await updateSystemTeacherProfile(
            {
                id: "cmuser000000000000000001",
                firstName: "สมชาย",
                lastName: "ใจดี",
                age: 40,
                schoolRole: "ครูแนะแนว",
                projectRole: "care",
                reason: "ตรวจสอบแล้วไม่มีข้อมูลเปลี่ยน",
            },
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "ไม่มีข้อมูลเปลี่ยนแปลง",
        });
        expect(prismaMocks.transaction).not.toHaveBeenCalled();
    });
});

function createTeacherRow(
    overrides: {
        firstName?: string;
        schoolRole?: string;
        projectRole?: "lead" | "care" | "coordinate";
    } = {},
) {
    return {
        id: "cmteacher00000000000001",
        firstName: overrides.firstName ?? "สมชาย",
        lastName: "ใจดี",
        age: 40,
        advisoryClass: "ม.1/1",
        schoolRole: overrides.schoolRole ?? "ครูแนะแนว",
        projectRole: overrides.projectRole ?? "care",
        user: {
            id: "cmuser000000000000000001",
            email: "teacher@example.com",
            name: "สมชาย ใจดี",
            role: "class_teacher",
            isPrimary: false,
            deletedAt: null,
            schoolId: "cmschool0000000000000001",
            school: { name: "โรงเรียนทดสอบ" },
        },
    };
}
