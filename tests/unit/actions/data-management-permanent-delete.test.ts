import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        student: {
            findUnique: vi.fn(),
            count: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn(),
        },
        school: { findUnique: vi.fn(), delete: vi.fn() },
        user: { count: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
        userSession: { deleteMany: vi.fn() },
        teacher: { deleteMany: vi.fn() },
        passwordResetToken: { deleteMany: vi.fn() },
        teacherInvite: { count: vi.fn(), deleteMany: vi.fn() },
        schoolAdminInvite: { count: vi.fn(), deleteMany: vi.fn() },
        schoolTeacherRoster: { deleteMany: vi.fn() },
        schoolClass: { deleteMany: vi.fn() },
        dataManagementEvent: { create: vi.fn() },
        phqResult: { count: vi.fn(), deleteMany: vi.fn() },
        activityProgress: { count: vi.fn(), deleteMany: vi.fn() },
        worksheetUpload: {
            count: vi.fn(),
            findMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        counselingSession: { count: vi.fn(), deleteMany: vi.fn() },
        studentReferral: { count: vi.fn(), deleteMany: vi.fn() },
        homeVisit: { count: vi.fn(), deleteMany: vi.fn() },
        homeVisitPhoto: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    };
    return { transaction: vi.fn(), dataManagementEventUpdate: vi.fn(), tx };
});

const cacheMocks = vi.hoisted(() => ({
    deleteFilesByUrl: vi.fn(),
    revalidateAnalyticsCache: vi.fn(),
    revalidateDashboardCache: vi.fn(),
    revalidatePath: vi.fn(),
    revalidateStudentsCache: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        $transaction: prismaMocks.transaction,
        dataManagementEvent: { update: prismaMocks.dataManagementEventUpdate },
    },
}));

vi.mock("next/cache", () => ({ revalidatePath: cacheMocks.revalidatePath }));
vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: cacheMocks.revalidateAnalyticsCache,
}));
vi.mock("@/lib/actions/dashboard/cache", () => ({
    revalidateDashboardCache: cacheMocks.revalidateDashboardCache,
}));
vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: cacheMocks.revalidateStudentsCache,
}));
vi.mock("@/lib/actions/data-management/helpers", () => ({
    DATA_MANAGEMENT_PATH: "/admin/data-management",
    createActorSnapshot: vi.fn((actor: { id: string }) => ({ id: actor.id })),
    createEmptyImpact: vi.fn(() => ({
        userCount: 0,
        studentCount: 0,
        activeStudentCount: 0,
        phqResultCount: 0,
        activityProgressCount: 0,
        counselingSessionCount: 0,
        homeVisitCount: 0,
        worksheetUploadCount: 0,
        homeVisitPhotoCount: 0,
        pendingTeacherInviteCount: 0,
        pendingSchoolAdminInviteCount: 0,
        fileCount: 0,
    })),
    impactToJsonObject: vi.fn((impact: unknown) => impact),
}));
vi.mock("@/lib/actions/data-management/file-storage", () => ({
    deleteFilesByUrl: cacheMocks.deleteFilesByUrl,
}));
vi.mock("@/lib/utils/logging", () => ({ logError: vi.fn() }));

import {
    permanentlyDeleteSchool,
    permanentlyDeleteStudent,
} from "@/lib/actions/data-management/permanent-delete";

const input = {
    id: "cmtarget000000000000001",
    reason: "ลบข้อมูลทดสอบ",
    expectedUpdatedAt: new Date("2026-07-15T00:00:00.000Z"),
    actor: {
        id: "cmadmin00000000000000001",
        email: "admin@example.com",
        name: "ผู้ดูแลระบบ",
        role: "system_admin",
    },
};

describe("data management permanent delete", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.transaction.mockImplementation(
            async (callback: (tx: typeof prismaMocks.tx) => Promise<unknown>) =>
                callback(prismaMocks.tx),
        );
        prismaMocks.tx.dataManagementEvent.create.mockResolvedValue({
            id: "event-1",
        });
        cacheMocks.deleteFilesByUrl.mockResolvedValue([]);
        prismaMocks.tx.worksheetUpload.findMany.mockResolvedValue([]);
        prismaMocks.tx.homeVisitPhoto.findMany.mockResolvedValue([]);
        setImpactCounts(0);
    });

    it("rejects an active student before deleting any data", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(
            createStudent({ disabledAt: null, isTestData: true }),
        );

        const result = await permanentlyDeleteStudent(input);

        expect(result).toEqual({
            success: false,
            message: "ต้องปิดใช้งานนักเรียนก่อนลบถาวร",
        });
        expect(prismaMocks.tx.student.delete).not.toHaveBeenCalled();
        expect(prismaMocks.tx.dataManagementEvent.create).not.toHaveBeenCalled();
        expect(cacheMocks.deleteFilesByUrl).not.toHaveBeenCalled();
    });

    it("rejects an invalid permanent-delete reason before opening a transaction", async () => {
        const result = await permanentlyDeleteStudent({
            ...input,
            reason: "ab",
        });

        expect(result).toEqual({
            success: false,
            message: "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร",
        });
        expect(prismaMocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects a disabled student that is marked as test data", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(
            createStudent({ disabledAt: new Date(), isTestData: true }),
        );

        const result = await permanentlyDeleteStudent(input);

        expect(result.message).toBe(
            "ต้องยกเลิกการตั้งนักเรียนเป็นข้อมูลทดสอบก่อนลบถาวร",
        );
        expect(prismaMocks.tx.student.delete).not.toHaveBeenCalled();
        expect(prismaMocks.tx.dataManagementEvent.create).not.toHaveBeenCalled();
    });

    it("rejects a stale student preview without deleting dependents", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(
            createStudent({
                disabledAt: new Date(),
                isTestData: false,
                updatedAt: new Date("2026-07-15T00:01:00.000Z"),
            }),
        );

        const result = await permanentlyDeleteStudent(input);

        expect(result.message).toContain("มีการเปลี่ยนแปลงหลังจากเปิดหน้าตรวจสอบ");
        expect(prismaMocks.tx.worksheetUpload.deleteMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.student.delete).not.toHaveBeenCalled();
        expect(prismaMocks.tx.dataManagementEvent.create).not.toHaveBeenCalled();
    });

    it("deletes an eligible student in one transaction and cleans files afterward", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(createStudent());
        prismaMocks.tx.worksheetUpload.findMany.mockResolvedValue([
            { fileUrl: "/api/uploads/worksheets/activity.png" },
        ]);
        prismaMocks.tx.homeVisitPhoto.findMany.mockResolvedValue([
            { fileUrl: "/api/uploads/home-visits/photo.png" },
        ]);

        const result = await permanentlyDeleteStudent(input);

        expect(result).toEqual({ success: true, message: "ลบถาวรนักเรียนสำเร็จ" });
        expect(prismaMocks.tx.dataManagementEvent.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    reason: input.reason,
                    targetSnapshot: expect.objectContaining({
                        class: "ป.6/1",
                        status: "ACTIVE",
                        disabledAt: expect.any(String),
                        isTestData: false,
                        updatedAt: input.expectedUpdatedAt.toISOString(),
                    }),
                }),
            }),
        );
        expect(prismaMocks.tx.student.delete).toHaveBeenCalledWith({
            where: { id: input.id },
        });
        expect(cacheMocks.deleteFilesByUrl).toHaveBeenCalledWith([
            "/api/uploads/worksheets/activity.png",
            "/api/uploads/home-visits/photo.png",
        ]);
        expect(
            cacheMocks.deleteFilesByUrl.mock.invocationCallOrder[0],
        ).toBeGreaterThan(prismaMocks.transaction.mock.invocationCallOrder[0]);
    });

    it("rolls back the student transaction when audit creation fails", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(createStudent());
        prismaMocks.tx.dataManagementEvent.create.mockRejectedValue(
            new Error("audit failed"),
        );

        const result = await permanentlyDeleteStudent(input);

        expect(result).toEqual({
            success: false,
            message: "เกิดข้อผิดพลาดในการลบถาวร",
        });
        expect(prismaMocks.tx.student.delete).not.toHaveBeenCalled();
        expect(cacheMocks.deleteFilesByUrl).not.toHaveBeenCalled();
    });

    it("rolls back the student transaction when dependent deletion fails", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(createStudent());
        prismaMocks.tx.activityProgress.deleteMany.mockRejectedValue(
            new Error("dependent delete failed"),
        );

        const result = await permanentlyDeleteStudent(input);

        expect(result.success).toBe(false);
        expect(result.message).toBe("เกิดข้อผิดพลาดในการลบถาวร");
        expect(prismaMocks.tx.dataManagementEvent.create).not.toHaveBeenCalled();
        expect(prismaMocks.tx.student.delete).not.toHaveBeenCalled();
        expect(cacheMocks.deleteFilesByUrl).not.toHaveBeenCalled();
    });

    it("does not repeat cleanup when a duplicate student request finds no target", async () => {
        prismaMocks.tx.student.findUnique
            .mockResolvedValueOnce(createStudent())
            .mockResolvedValueOnce(null);

        await permanentlyDeleteStudent(input);
        const secondResult = await permanentlyDeleteStudent(input);

        expect(secondResult).toEqual({ success: false, message: "ไม่พบนักเรียน" });
        expect(cacheMocks.deleteFilesByUrl).toHaveBeenCalledTimes(1);
        expect(prismaMocks.tx.dataManagementEvent.create).toHaveBeenCalledTimes(1);
    });

    it("rejects an active school before deletion", async () => {
        prismaMocks.tx.school.findUnique.mockResolvedValue(
            createSchool({ disabledAt: null, isTestData: true }),
        );

        const result = await permanentlyDeleteSchool(input);

        expect(result.message).toBe("ต้องปิดใช้งานโรงเรียนก่อนลบถาวร");
        expect(prismaMocks.tx.school.delete).not.toHaveBeenCalled();
        expect(prismaMocks.tx.dataManagementEvent.create).not.toHaveBeenCalled();
    });

    it("rejects a school marked as test data even when it is disabled", async () => {
        prismaMocks.tx.school.findUnique.mockResolvedValue(
            createSchool({ disabledAt: new Date(), isTestData: true }),
        );

        const result = await permanentlyDeleteSchool(input);

        expect(result.message).toBe(
            "ต้องยกเลิกการตั้งโรงเรียนเป็นข้อมูลทดสอบก่อนลบถาวร",
        );
        expect(prismaMocks.tx.school.delete).not.toHaveBeenCalled();
    });

    it("rejects a stale school preview", async () => {
        prismaMocks.tx.school.findUnique.mockResolvedValue(
            createSchool({
                updatedAt: new Date("2026-07-15T00:01:00.000Z"),
            }),
        );

        const result = await permanentlyDeleteSchool(input);

        expect(result.message).toContain("มีการเปลี่ยนแปลงหลังจากเปิดหน้าตรวจสอบ");
        expect(prismaMocks.tx.school.delete).not.toHaveBeenCalled();
    });

    it("keeps a school with a linked system admin protected", async () => {
        prismaMocks.tx.school.findUnique.mockResolvedValue(createSchool());
        prismaMocks.tx.user.count.mockResolvedValue(1);

        const result = await permanentlyDeleteSchool(input);

        expect(result).toEqual({
            success: false,
            message: "ไม่สามารถลบโรงเรียนที่มี System Admin ผูกอยู่",
        });
        expect(prismaMocks.tx.school.delete).not.toHaveBeenCalled();
        expect(prismaMocks.tx.dataManagementEvent.create).not.toHaveBeenCalled();
    });

    it("deletes an eligible school, users, dependents, and audit event atomically", async () => {
        prismaMocks.tx.school.findUnique.mockResolvedValue(createSchool());
        prismaMocks.tx.user.count.mockResolvedValue(0);
        prismaMocks.tx.user.findMany.mockResolvedValue([
            { id: "user-1", email: "teacher@example.com" },
        ]);

        const result = await permanentlyDeleteSchool(input);

        expect(result).toEqual({ success: true, message: "ลบถาวรโรงเรียนสำเร็จ" });
        expect(prismaMocks.tx.dataManagementEvent.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    reason: input.reason,
                    targetSnapshot: expect.objectContaining({
                        disabledAt: expect.any(String),
                        isTestData: false,
                        updatedAt: input.expectedUpdatedAt.toISOString(),
                    }),
                }),
            }),
        );
        expect(prismaMocks.tx.user.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ["user-1"] } },
        });
        expect(prismaMocks.tx.school.delete).toHaveBeenCalledWith({
            where: { id: input.id },
        });
        expect(cacheMocks.deleteFilesByUrl).toHaveBeenCalled();
    });

    it("rolls back a school transaction when user references remain", async () => {
        prismaMocks.tx.school.findUnique.mockResolvedValue(createSchool());
        prismaMocks.tx.user.count.mockResolvedValue(0);
        prismaMocks.tx.user.findMany.mockResolvedValue([
            { id: "user-1", email: "teacher@example.com" },
        ]);
        prismaMocks.tx.phqResult.count
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(1)
            .mockResolvedValue(0);

        const result = await permanentlyDeleteSchool(input);

        expect(result.message).toContain("ยังมีข้อมูลที่อ้างถึงผู้ใช้");
        expect(prismaMocks.tx.dataManagementEvent.create).not.toHaveBeenCalled();
        expect(prismaMocks.tx.school.delete).not.toHaveBeenCalled();
        expect(cacheMocks.deleteFilesByUrl).not.toHaveBeenCalled();
    });
});

function setImpactCounts(value: number): void {
    prismaMocks.tx.student.count.mockResolvedValue(value);
    prismaMocks.tx.teacherInvite.count.mockResolvedValue(value);
    prismaMocks.tx.schoolAdminInvite.count.mockResolvedValue(value);
    prismaMocks.tx.homeVisitPhoto.count.mockResolvedValue(value);
    prismaMocks.tx.phqResult.count.mockResolvedValue(value);
    prismaMocks.tx.activityProgress.count.mockResolvedValue(value);
    prismaMocks.tx.worksheetUpload.count.mockResolvedValue(value);
    prismaMocks.tx.counselingSession.count.mockResolvedValue(value);
    prismaMocks.tx.studentReferral.count.mockResolvedValue(value);
    prismaMocks.tx.homeVisit.count.mockResolvedValue(value);
    prismaMocks.tx.user.count.mockResolvedValue(value);
}

function createStudent(overrides: {
    disabledAt?: Date | null;
    isTestData?: boolean;
    updatedAt?: Date;
} = {}) {
    return {
        id: input.id,
        studentId: "1001",
        firstName: "สมชาย",
        lastName: "ใจดี",
        schoolId: "cmschool0000000000000001",
        class: "ป.6/1",
        status: "ACTIVE",
        disabledAt: "disabledAt" in overrides
            ? overrides.disabledAt ?? null
            : new Date("2026-07-14T00:00:00.000Z"),
        isTestData: overrides.isTestData ?? false,
        updatedAt: overrides.updatedAt ?? input.expectedUpdatedAt,
        school: { name: "โรงเรียนทดสอบ" },
    };
}

function createSchool(overrides: {
    disabledAt?: Date | null;
    isTestData?: boolean;
    updatedAt?: Date;
} = {}) {
    return {
        id: input.id,
        name: "โรงเรียนทดสอบ",
        province: "เชียงใหม่",
        disabledAt: "disabledAt" in overrides
            ? overrides.disabledAt ?? null
            : new Date("2026-07-14T00:00:00.000Z"),
        isTestData: overrides.isTestData ?? false,
        updatedAt: overrides.updatedAt ?? input.expectedUpdatedAt,
    };
}
