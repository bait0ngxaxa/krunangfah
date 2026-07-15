import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/actions/system-admin/mutations";
import {
    permanentlyDeleteSystemStaffAccount,
    restoreSystemStaffAccount,
} from "@/lib/actions/system-admin/staff-account-mutations";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        user: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
        userSession: { deleteMany: vi.fn() },
        teacherInvite: { deleteMany: vi.fn() },
        schoolAdminInvite: { deleteMany: vi.fn() },
        schoolTeacherRoster: { deleteMany: vi.fn() },
        passwordResetToken: { deleteMany: vi.fn() },
        worksheetUpload: { deleteMany: vi.fn() },
        activityProgress: { deleteMany: vi.fn() },
        phqResult: { deleteMany: vi.fn() },
        counselingSession: { deleteMany: vi.fn() },
        studentReferral: { deleteMany: vi.fn() },
        homeVisitPhoto: { deleteMany: vi.fn() },
        homeVisit: { deleteMany: vi.fn() },
        teacher: { deleteMany: vi.fn() },
        systemAdminEvent: { create: vi.fn() },
    };
    return { transaction: vi.fn(), tx };
});

const cacheMocks = vi.hoisted(() => ({
    deleteUserSessionCaches: vi.fn(),
    revalidateDashboardCache: vi.fn(),
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: { $transaction: prismaMocks.transaction },
}));

vi.mock("@/lib/auth/session-cache", () => ({
    deleteUserSessionCaches: cacheMocks.deleteUserSessionCaches,
}));

vi.mock("@/lib/actions/dashboard/cache", () => ({
    revalidateDashboardCache: cacheMocks.revalidateDashboardCache,
}));

vi.mock("next/cache", () => ({ revalidatePath: cacheMocks.revalidatePath }));

const actor: Actor = {
    id: "cmadmin00000000000000001",
    email: "admin@example.com",
    name: "ผู้ดูแลระบบ",
    role: "system_admin",
};

const target = {
    id: "cmuser000000000000000001",
    email: "teacher@example.com",
    name: "สมชาย ใจดี",
    role: "class_teacher" as const,
    isPrimary: false,
    deletedAt: new Date("2026-07-01T00:00:00.000Z"),
    password: "hashed-password",
    teacher: { id: "cmteacher00000000000001" },
};

describe("system admin staff account mutations", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.transaction.mockImplementation(
            async (callback: (tx: typeof prismaMocks.tx) => Promise<unknown>) =>
                callback(prismaMocks.tx),
        );
        prismaMocks.tx.user.findUnique.mockResolvedValue(target);
    });

    it("restores a soft-deleted teacher account and records the reason", async () => {
        const result = await restoreSystemStaffAccount(
            {
                id: target.id,
                reason: "ตรวจสอบแล้วเป็นบัญชีครูที่ยังใช้งานอยู่",
            },
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.user.update).toHaveBeenCalledWith({
            where: { id: target.id },
            data: { deletedAt: null },
        });
        expect(prismaMocks.tx.systemAdminEvent.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                targetType: "user",
                targetId: target.id,
                action: "EDIT",
                reason: "ตรวจสอบแล้วเป็นบัญชีครูที่ยังใช้งานอยู่",
                actorUserId: actor.id,
            }),
        });
        expect(cacheMocks.deleteUserSessionCaches).toHaveBeenCalledWith(target.id);
    });

    it("rejects restoring a staff account while its school is disabled", async () => {
        prismaMocks.tx.user.findUnique.mockResolvedValue({
            ...target,
            school: { disabledAt: new Date("2026-07-10T00:00:00.000Z") },
        });

        const result = await restoreSystemStaffAccount(
            {
                id: target.id,
                reason: "ต้องการเปิดบัญชีครูอีกครั้ง",
            },
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "ต้องกู้คืนโรงเรียนก่อนจึงจะกู้คืนบัญชีบุคลากรได้",
        });
        expect(prismaMocks.tx.user.update).not.toHaveBeenCalled();
        expect(prismaMocks.tx.systemAdminEvent.create).not.toHaveBeenCalled();
        expect(cacheMocks.deleteUserSessionCaches).not.toHaveBeenCalled();
    });

    it("deletes every database record tied to a closed teacher account", async () => {
        const result = await permanentlyDeleteSystemStaffAccount(
            {
                id: target.id,
                reason: "ยืนยันว่าเป็นบัญชีทดสอบที่สร้างผิด",
                confirmation: target.email,
            },
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.teacherInvite.deleteMany).toHaveBeenCalledWith({
            where: {
                OR: [{ invitedById: target.id }, { email: target.email }],
            },
        });
        expect(prismaMocks.tx.schoolAdminInvite.deleteMany).toHaveBeenCalledWith({
            where: {
                OR: [{ createdBy: target.id }, { email: target.email }],
            },
        });
        expect(prismaMocks.tx.passwordResetToken.deleteMany).toHaveBeenCalledWith({
            where: { email: target.email },
        });
        expect(prismaMocks.tx.schoolTeacherRoster.deleteMany).toHaveBeenCalledWith({
            where: { email: target.email },
        });
        expect(prismaMocks.tx.worksheetUpload.deleteMany).toHaveBeenCalledWith({
            where: {
                OR: [
                    { uploadedById: target.id },
                    { activityProgress: { teacherId: target.id } },
                    {
                        activityProgress: {
                            phqResult: { importedById: target.id },
                        },
                    },
                ],
            },
        });
        expect(prismaMocks.tx.activityProgress.deleteMany).toHaveBeenCalledWith({
            where: {
                OR: [
                    { teacherId: target.id },
                    { phqResult: { importedById: target.id } },
                ],
            },
        });
        expect(prismaMocks.tx.phqResult.deleteMany).toHaveBeenCalledWith({
            where: { importedById: target.id },
        });
        expect(prismaMocks.tx.counselingSession.deleteMany).toHaveBeenCalledWith({
            where: { createdById: target.id },
        });
        expect(prismaMocks.tx.studentReferral.deleteMany).toHaveBeenCalledWith({
            where: {
                OR: [
                    { fromTeacherUserId: target.id },
                    { toTeacherUserId: target.id },
                ],
            },
        });
        expect(prismaMocks.tx.homeVisitPhoto.deleteMany).toHaveBeenCalledWith({
            where: { homeVisit: { createdById: target.id } },
        });
        expect(prismaMocks.tx.homeVisit.deleteMany).toHaveBeenCalledWith({
            where: { createdById: target.id },
        });
        expect(prismaMocks.tx.teacher.deleteMany).toHaveBeenCalledWith({
            where: { userId: target.id },
        });
        expect(prismaMocks.tx.userSession.deleteMany).toHaveBeenCalledWith({
            where: { userId: target.id },
        });
        expect(prismaMocks.tx.user.delete).toHaveBeenCalledWith({
            where: { id: target.id },
        });
    });

    it("requires soft deletion before permanent deletion", async () => {
        prismaMocks.tx.user.findUnique.mockResolvedValue({
            ...target,
            deletedAt: null,
        });

        const activeResult = await permanentlyDeleteSystemStaffAccount(
            {
                id: target.id,
                reason: "บัญชีทดสอบ",
                confirmation: target.email,
            },
            actor,
        );

        expect(activeResult).toEqual({
            success: false,
            message: "ต้องปิดบัญชีก่อนลบถาวร",
        });
        expect(prismaMocks.tx.user.delete).not.toHaveBeenCalled();
    });

    it("requires exact email confirmation before permanent deletion", async () => {
        const result = await permanentlyDeleteSystemStaffAccount(
            {
                id: target.id,
                reason: "บัญชีทดสอบ",
                confirmation: "another@example.com",
            },
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "อีเมลยืนยันไม่ตรงกับบัญชีที่ต้องการลบ",
        });
        expect(prismaMocks.tx.user.delete).not.toHaveBeenCalled();
    });
});
