import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/actions/system-admin/mutations";
import {
    permanentlyDeleteSystemStaffAccount,
    restoreSystemStaffAccount,
} from "@/lib/actions/system-admin/staff-account-mutations";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        user: { findUnique: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
        userSession: { deleteMany: vi.fn() },
        teacherInvite: { deleteMany: vi.fn() },
        schoolAdminInvite: { deleteMany: vi.fn() },
        schoolTeacherRoster: { deleteMany: vi.fn() },
        passwordResetToken: { deleteMany: vi.fn() },
        worksheetUpload: { findMany: vi.fn(), updateMany: vi.fn() },
        activityProgress: { findMany: vi.fn(), updateMany: vi.fn() },
        phqResult: { findMany: vi.fn(), updateMany: vi.fn() },
        counselingSession: { findMany: vi.fn(), updateMany: vi.fn() },
        studentReferral: { findMany: vi.fn(), deleteMany: vi.fn() },
        homeVisit: { findMany: vi.fn(), updateMany: vi.fn() },
        teacher: { deleteMany: vi.fn() },
        systemAdminEvent: { create: vi.fn() },
    };
    return { transaction: vi.fn(), tx };
});

const cacheMocks = vi.hoisted(() => ({
    deleteUserSessionCaches: vi.fn(),
    deleteFilesByUrl: vi.fn(),
    revalidateDashboardCache: vi.fn(),
    revalidateAnalyticsCache: vi.fn(),
    revalidateStudentsCache: vi.fn(),
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
const lifecycle = vi.hoisted(() => ({ events: [] as string[] }));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: cacheMocks.revalidateAnalyticsCache,
}));

vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: cacheMocks.revalidateStudentsCache,
}));

vi.mock("@/lib/actions/data-management/file-storage", () => ({
    deleteFilesByUrl: cacheMocks.deleteFilesByUrl,
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
    updatedAt: new Date("2026-07-15T00:00:00.000Z"),
    schoolId: "cmschool0000000000000001",
    teacher: { id: "cmteacher00000000000001" },
};

describe("system admin staff account mutations", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        lifecycle.events.length = 0;
        prismaMocks.transaction.mockImplementation(
            async (callback: (tx: typeof prismaMocks.tx) => Promise<unknown>) => {
                const result = await callback(prismaMocks.tx);
                lifecycle.events.push("commit");
                return result;
            },
        );
        prismaMocks.tx.user.findUnique.mockResolvedValue(target);
        prismaMocks.tx.phqResult.findMany.mockResolvedValue([
            { studentId: "cmstudent000000000000001" },
        ]);
        prismaMocks.tx.activityProgress.findMany.mockResolvedValue([]);
        prismaMocks.tx.worksheetUpload.findMany.mockResolvedValue([]);
        prismaMocks.tx.counselingSession.findMany.mockResolvedValue([]);
        prismaMocks.tx.homeVisit.findMany.mockResolvedValue([]);
        prismaMocks.tx.studentReferral.findMany.mockResolvedValue([]);
        cacheMocks.deleteFilesByUrl.mockImplementation(async () => {
            lifecycle.events.push("files");
            return [];
        });
        prismaMocks.tx.user.updateMany.mockResolvedValue({ count: 1 });
        prismaMocks.tx.user.deleteMany.mockResolvedValue({ count: 1 });
    });

    it("restores a soft-deleted teacher account and records the reason", async () => {
        const result = await restoreSystemStaffAccount(
            {
                id: target.id,
                reason: "ตรวจสอบแล้วเป็นบัญชีครูที่ยังใช้งานอยู่",
                expectedUpdatedAt: target.updatedAt,
            },
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.user.updateMany).toHaveBeenCalledWith({
            where: { id: target.id, updatedAt: target.updatedAt },
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
                expectedUpdatedAt: target.updatedAt,
            },
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "ต้องกู้คืนโรงเรียนก่อนจึงจะกู้คืนบัญชีบุคลากรได้",
        });
        expect(prismaMocks.tx.user.updateMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.systemAdminEvent.create).not.toHaveBeenCalled();
        expect(cacheMocks.deleteUserSessionCaches).not.toHaveBeenCalled();
    });

    it("deletes only the account and profile while preserving student care history", async () => {
        const result = await permanentlyDeleteSystemStaffAccount(
            {
                id: target.id,
                reason: "ยืนยันว่าเป็นบัญชีทดสอบที่สร้างผิด",
                confirmation: target.email,
                expectedUpdatedAt: target.updatedAt,
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
        const actorSnapshot = {
            id: target.id,
            email: target.email,
            name: target.name,
            role: target.role,
        };
        expect(prismaMocks.tx.worksheetUpload.updateMany).toHaveBeenCalledWith({
            where: { uploadedById: target.id },
            data: { uploadedById: null, uploadedBySnapshot: actorSnapshot },
        });
        expect(prismaMocks.tx.activityProgress.updateMany).toHaveBeenCalledWith({
            where: { teacherId: target.id },
            data: { teacherId: null, teacherSnapshot: actorSnapshot },
        });
        expect(prismaMocks.tx.phqResult.updateMany).toHaveBeenCalledWith({
            where: { importedById: target.id },
            data: { importedById: null, importedBySnapshot: actorSnapshot },
        });
        expect(prismaMocks.tx.counselingSession.updateMany).toHaveBeenCalledWith({
            where: { createdById: target.id },
            data: { createdById: null, createdBySnapshot: actorSnapshot },
        });
        expect(prismaMocks.tx.studentReferral.deleteMany).toHaveBeenCalledWith({
            where: {
                OR: [
                    { fromTeacherUserId: target.id },
                    { toTeacherUserId: target.id },
                ],
            },
        });
        expect(prismaMocks.tx.homeVisit.updateMany).toHaveBeenCalledWith({
            where: { createdById: target.id },
            data: { createdById: null, createdBySnapshot: actorSnapshot },
        });
        expect(prismaMocks.tx.teacher.deleteMany).toHaveBeenCalledWith({
            where: { userId: target.id },
        });
        expect(prismaMocks.tx.userSession.deleteMany).toHaveBeenCalledWith({
            where: { userId: target.id },
        });
        expect(prismaMocks.tx.user.deleteMany).toHaveBeenCalledWith({
            where: { id: target.id, updatedAt: target.updatedAt },
        });
        expect(cacheMocks.deleteFilesByUrl).toHaveBeenCalledWith([]);
        expect(cacheMocks.revalidateStudentsCache).toHaveBeenCalledWith(
            target.schoolId,
            "cmstudent000000000000001",
        );
        expect(cacheMocks.revalidateAnalyticsCache).toHaveBeenCalledWith(
            target.schoolId,
        );
        expect(lifecycle.events).toEqual(["commit", "files"]);
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
                expectedUpdatedAt: target.updatedAt,
            },
            actor,
        );

        expect(activeResult).toEqual({
            success: false,
            message: "ต้องปิดบัญชีก่อนลบถาวร",
        });
        expect(prismaMocks.tx.user.deleteMany).not.toHaveBeenCalled();
    });

    it("requires exact email confirmation before permanent deletion", async () => {
        const result = await permanentlyDeleteSystemStaffAccount(
            {
                id: target.id,
                reason: "บัญชีทดสอบ",
                confirmation: "another@example.com",
                expectedUpdatedAt: target.updatedAt,
            },
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "อีเมลยืนยันไม่ตรงกับบัญชีที่ต้องการลบ",
        });
        expect(prismaMocks.tx.user.deleteMany).not.toHaveBeenCalled();
    });

    it("rejects a stale restore token without recording an event", async () => {
        prismaMocks.tx.user.updateMany.mockResolvedValue({ count: 0 });

        const result = await restoreSystemStaffAccount(
            {
                id: target.id,
                reason: "กู้คืนจากผลค้นหาเดิม",
                expectedUpdatedAt: target.updatedAt,
            },
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "ข้อมูลบัญชีถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่",
        });
        expect(prismaMocks.tx.systemAdminEvent.create).not.toHaveBeenCalled();
    });

    it("rolls back permanent deletion when the account token is stale", async () => {
        prismaMocks.tx.user.deleteMany.mockResolvedValue({ count: 0 });

        const result = await permanentlyDeleteSystemStaffAccount(
            {
                id: target.id,
                reason: "ลบจากผลค้นหาเดิม",
                confirmation: target.email,
                expectedUpdatedAt: target.updatedAt,
            },
            actor,
        );

        expect(result).toEqual({
            success: false,
            message: "ข้อมูลบัญชีถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่",
        });
        expect(cacheMocks.deleteFilesByUrl).not.toHaveBeenCalled();
        expect(cacheMocks.deleteUserSessionCaches).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateStudentsCache).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateAnalyticsCache).not.toHaveBeenCalled();
    });
});
