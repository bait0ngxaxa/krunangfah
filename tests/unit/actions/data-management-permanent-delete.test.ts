import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        student: { findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
        school: { findUnique: vi.fn(), delete: vi.fn() },
        user: { count: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
        userSession: { deleteMany: vi.fn() },
        teacher: { deleteMany: vi.fn() },
        passwordResetToken: { deleteMany: vi.fn() },
        teacherInvite: { deleteMany: vi.fn() },
        schoolAdminInvite: { deleteMany: vi.fn() },
        schoolTeacherRoster: { deleteMany: vi.fn() },
        schoolClass: { deleteMany: vi.fn() },
        dataManagementEvent: { create: vi.fn() },
        phqResult: { count: vi.fn(), deleteMany: vi.fn() },
        activityProgress: { count: vi.fn(), deleteMany: vi.fn() },
        worksheetUpload: { count: vi.fn(), deleteMany: vi.fn() },
        counselingSession: { count: vi.fn(), deleteMany: vi.fn() },
        studentReferral: { count: vi.fn(), deleteMany: vi.fn() },
        homeVisit: { count: vi.fn(), deleteMany: vi.fn() },
        homeVisitPhoto: { deleteMany: vi.fn() },
    };
    return {
        transaction: vi.fn(),
        dataManagementEventUpdate: vi.fn(),
        worksheetUploadFindMany: vi.fn(),
        homeVisitPhotoFindMany: vi.fn(),
        tx,
    };
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
        worksheetUpload: { findMany: prismaMocks.worksheetUploadFindMany },
        homeVisitPhoto: { findMany: prismaMocks.homeVisitPhotoFindMany },
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

vi.mock("@/lib/actions/data-management/helpers", () => ({
    DATA_MANAGEMENT_PATH: "/admin/data-management",
    createActorSnapshot: vi.fn((actor: { id: string }) => ({ id: actor.id })),
    impactToJsonObject: vi.fn((impact: unknown) => impact),
}));

vi.mock("@/lib/actions/data-management/file-storage", () => ({
    deleteFilesByUrl: cacheMocks.deleteFilesByUrl,
}));

vi.mock("@/lib/actions/data-management/preview", () => ({
    getSchoolImpact: vi.fn(),
    getStudentImpact: vi.fn(),
}));

import {
    permanentlyDeleteSchool,
    permanentlyDeleteStudent,
} from "@/lib/actions/data-management/permanent-delete";

const input = {
    id: "cmtarget000000000000001",
    reason: "ลบข้อมูลทดสอบ",
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
    });

    it("does not run cleanup or cache invalidation when the student is missing", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(null);

        const result = await permanentlyDeleteStudent(input);

        expect(result).toEqual({ success: false, message: "ไม่พบนักเรียน" });
        expect(cacheMocks.deleteFilesByUrl).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateStudentsCache).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateAnalyticsCache).not.toHaveBeenCalled();
        expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("deletes student care relations before permanently deleting the student", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(createStudent());
        prismaMocks.tx.dataManagementEvent.create.mockResolvedValue({ id: "event-1" });
        prismaMocks.worksheetUploadFindMany.mockResolvedValue([
            { fileUrl: "/api/uploads/worksheets/activity.png" },
        ]);
        prismaMocks.homeVisitPhotoFindMany.mockResolvedValue([
            { fileUrl: "/api/uploads/home-visits/photo.png" },
        ]);
        cacheMocks.deleteFilesByUrl.mockResolvedValue([]);

        const result = await permanentlyDeleteStudent(input);

        expect(result).toEqual({
            success: true,
            message: "ลบถาวรนักเรียนสำเร็จ",
        });
        expect(prismaMocks.tx.worksheetUpload.deleteMany).toHaveBeenCalledWith({
            where: { activityProgress: { studentId: input.id } },
        });
        expect(prismaMocks.tx.homeVisitPhoto.deleteMany).toHaveBeenCalledWith({
            where: { homeVisit: { studentId: input.id } },
        });
        expect(prismaMocks.tx.studentReferral.deleteMany).toHaveBeenCalledWith({
            where: { studentId: input.id },
        });
        expect(prismaMocks.tx.activityProgress.deleteMany).toHaveBeenCalledWith({
            where: { studentId: input.id },
        });
        expect(prismaMocks.tx.phqResult.deleteMany).toHaveBeenCalledWith({
            where: { studentId: input.id },
        });
        expect(prismaMocks.tx.counselingSession.deleteMany).toHaveBeenCalledWith({
            where: { studentId: input.id },
        });
        expect(prismaMocks.tx.homeVisit.deleteMany).toHaveBeenCalledWith({
            where: { studentId: input.id },
        });
        expect(prismaMocks.tx.student.delete).toHaveBeenCalledWith({
            where: { id: input.id },
        });
    });

    it("does not run cleanup or cache invalidation when the school is missing", async () => {
        prismaMocks.tx.school.findUnique.mockResolvedValue(null);

        const result = await permanentlyDeleteSchool(input);

        expect(result).toEqual({ success: false, message: "ไม่พบโรงเรียน" });
        expect(cacheMocks.deleteFilesByUrl).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateDashboardCache).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateStudentsCache).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateAnalyticsCache).not.toHaveBeenCalled();
        expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("deletes school, student, and user relations before permanently deleting the school", async () => {
        prismaMocks.tx.school.findUnique.mockResolvedValue(createSchool());
        prismaMocks.tx.user.count.mockResolvedValue(0);
        prismaMocks.tx.user.findMany.mockResolvedValue([
            { id: "user-1", email: "teacher@example.com" },
            { id: "user-2", email: null },
        ]);
        prismaMocks.tx.dataManagementEvent.create.mockResolvedValue({ id: "event-1" });
        prismaMocks.worksheetUploadFindMany.mockResolvedValue([
            { fileUrl: "/api/uploads/worksheets/school-activity.png" },
        ]);
        prismaMocks.homeVisitPhotoFindMany.mockResolvedValue([
            { fileUrl: "/api/uploads/home-visits/school-photo.png" },
        ]);
        cacheMocks.deleteFilesByUrl.mockResolvedValue([]);

        const result = await permanentlyDeleteSchool(input);

        expect(result).toEqual({
            success: true,
            message: "ลบถาวรโรงเรียนสำเร็จ",
        });
        expect(prismaMocks.tx.teacherInvite.deleteMany).toHaveBeenCalledWith({
            where: {
                OR: [
                    { schoolId: input.id },
                    { invitedById: { in: ["user-1", "user-2"] } },
                ],
            },
        });
        expect(prismaMocks.tx.schoolAdminInvite.deleteMany).toHaveBeenCalledWith({
            where: {
                OR: [
                    { createdBy: { in: ["user-1", "user-2"] } },
                    { email: { in: ["teacher@example.com"] } },
                ],
            },
        });
        expect(prismaMocks.tx.worksheetUpload.deleteMany).toHaveBeenCalledWith({
            where: { activityProgress: { student: { schoolId: input.id } } },
        });
        expect(prismaMocks.tx.homeVisitPhoto.deleteMany).toHaveBeenCalledWith({
            where: { homeVisit: { student: { schoolId: input.id } } },
        });
        expect(prismaMocks.tx.studentReferral.deleteMany).toHaveBeenCalledWith({
            where: { student: { schoolId: input.id } },
        });
        expect(prismaMocks.tx.activityProgress.deleteMany).toHaveBeenCalledWith({
            where: { student: { schoolId: input.id } },
        });
        expect(prismaMocks.tx.phqResult.deleteMany).toHaveBeenCalledWith({
            where: { student: { schoolId: input.id } },
        });
        expect(prismaMocks.tx.counselingSession.deleteMany).toHaveBeenCalledWith({
            where: { student: { schoolId: input.id } },
        });
        expect(prismaMocks.tx.homeVisit.deleteMany).toHaveBeenCalledWith({
            where: { student: { schoolId: input.id } },
        });
        expect(prismaMocks.tx.userSession.deleteMany).toHaveBeenCalledWith({
            where: { userId: { in: ["user-1", "user-2"] } },
        });
        expect(prismaMocks.tx.teacher.deleteMany).toHaveBeenCalledWith({
            where: { userId: { in: ["user-1", "user-2"] } },
        });
        expect(prismaMocks.tx.passwordResetToken.deleteMany).toHaveBeenCalledWith({
            where: { email: { in: ["teacher@example.com"] } },
        });
        expect(prismaMocks.tx.user.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ["user-1", "user-2"] } },
        });
        expect(prismaMocks.tx.school.delete).toHaveBeenCalledWith({
            where: { id: input.id },
        });
    });
});

function createStudent() {
    return {
        id: input.id,
        studentId: "1001",
        nationalId: "1234567890123",
        firstName: "สมชาย",
        lastName: "ใจดี",
        schoolId: "cmschool0000000000000001",
        school: { id: "cmschool0000000000000001", name: "โรงเรียนทดสอบ" },
    };
}

function createSchool() {
    return {
        id: input.id,
        name: "โรงเรียนทดสอบ",
        province: "เชียงใหม่",
    };
}
