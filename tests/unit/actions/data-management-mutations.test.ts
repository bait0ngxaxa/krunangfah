import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        school: { findUnique: vi.fn(), update: vi.fn() },
        student: { findUnique: vi.fn(), update: vi.fn() },
        schoolClass: {
            findUnique: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
        schoolClassTerm: { upsert: vi.fn(), updateMany: vi.fn() },
        academicYear: { findFirst: vi.fn() },
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
    markSchoolAsTestData,
    markStudentAsTestData,
    restoreStudent,
} from "@/lib/actions/data-management/mutations";
import {
    getSchoolImpact,
    getStudentImpact,
} from "@/lib/actions/data-management/preview";
import type { ImpactSummary } from "@/lib/actions/data-management/types";

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

const impact: ImpactSummary = {
    userCount: 0,
    studentCount: 0,
    activeStudentCount: 0,
    phqResultCount: 0,
    activityProgressCount: 0,
    counselingSessionCount: 0,
    homeVisitCount: 0,
    worksheetUploadCount: 0,
    homeVisitPhotoCount: 0,
    studentReferralCount: 0,
    pendingTeacherInviteCount: 0,
    pendingSchoolAdminInviteCount: 0,
    fileCount: 0,
};

describe("data management mutations", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.transaction.mockImplementation(
            async (callback: (tx: typeof prismaMocks.tx) => Promise<unknown>) =>
                callback(prismaMocks.tx),
        );
        prismaMocks.tx.dataManagementEvent.create.mockResolvedValue({
            id: "event-1",
        });
        prismaMocks.tx.academicYear.findFirst.mockResolvedValue({ id: "ay-1" });
        prismaMocks.tx.schoolClass.findUnique.mockResolvedValue({
            id: "class-1",
            expectedStudentCount: 30,
        });
        prismaMocks.tx.schoolClass.update.mockResolvedValue({
            id: "class-1",
            expectedStudentCount: 30,
        });
        prismaMocks.tx.schoolClass.updateMany.mockResolvedValue({ count: 1 });
        prismaMocks.tx.schoolClassTerm.upsert.mockResolvedValue({ id: "term-1" });
        prismaMocks.tx.schoolClassTerm.updateMany.mockResolvedValue({ count: 1 });
        vi.mocked(getSchoolImpact).mockResolvedValue(impact);
        vi.mocked(getStudentImpact).mockResolvedValue(impact);
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

    it("rejects disabling a test-data school before changing state", async () => {
        prismaMocks.tx.school.findUnique.mockResolvedValue({
            id: input.id,
            name: "โรงเรียนทดสอบ",
            province: "เชียงใหม่",
            disabledAt: null,
            isTestData: true,
        });
        prismaMocks.tx.user.findMany.mockResolvedValue([]);

        const result = await disableSchool(input);

        expect(result).toEqual({
            success: false,
            message: "ไม่สามารถปิดใช้งานโรงเรียนที่เป็นข้อมูลทดสอบได้",
        });
        expect(prismaMocks.tx.school.update).not.toHaveBeenCalled();
        expect(prismaMocks.tx.dataManagementEvent.create).not.toHaveBeenCalled();
    });

    it("rejects disabling a test-data student before changing state", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue({
            id: input.id,
            studentId: "1001",
            firstName: "สมชาย",
            lastName: "ใจดี",
            schoolId: "cmschool0000000000000001",
            class: "ป.6/1",
            status: "ACTIVE",
            disabledAt: null,
            isTestData: true,
            school: { id: "cmschool0000000000000001", name: "โรงเรียนทดสอบ" },
        });

        const result = await disableStudent(input);

        expect(result).toEqual({
            success: false,
            message: "ไม่สามารถปิดใช้งานนักเรียนที่เป็นข้อมูลทดสอบได้",
        });
        expect(prismaMocks.tx.student.update).not.toHaveBeenCalled();
        expect(prismaMocks.tx.dataManagementEvent.create).not.toHaveBeenCalled();
    });

    it("rejects marking a disabled school as test data", async () => {
        prismaMocks.tx.school.findUnique.mockResolvedValue({
            id: input.id,
            name: "โรงเรียนทดสอบ",
            province: "เชียงใหม่",
            disabledAt: new Date("2026-07-14T00:00:00.000Z"),
            isTestData: false,
        });
        prismaMocks.tx.user.findMany.mockResolvedValue([]);

        const result = await markSchoolAsTestData(input);

        expect(result).toEqual({
            success: false,
            message: "ต้องเปิดใช้งานโรงเรียนก่อนจึงจะตั้งเป็นข้อมูลทดสอบได้",
        });
        expect(prismaMocks.tx.school.update).not.toHaveBeenCalled();
        expect(prismaMocks.tx.dataManagementEvent.create).not.toHaveBeenCalled();
    });

    it("rejects marking a disabled student as test data", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue({
            id: input.id,
            studentId: "1001",
            firstName: "สมชาย",
            lastName: "ใจดี",
            schoolId: "cmschool0000000000000001",
            class: "ป.6/1",
            status: "ACTIVE",
            disabledAt: new Date("2026-07-14T00:00:00.000Z"),
            isTestData: false,
            school: {
                id: "cmschool0000000000000001",
                name: "โรงเรียนทดสอบ",
            },
        });

        const result = await markStudentAsTestData(input);

        expect(result).toEqual({
            success: false,
            message: "ต้องเปิดใช้งานนักเรียนก่อนจึงจะตั้งเป็นข้อมูลทดสอบได้",
        });
        expect(prismaMocks.tx.student.update).not.toHaveBeenCalled();
        expect(prismaMocks.tx.dataManagementEvent.create).not.toHaveBeenCalled();
    });

    it("disables an active student and decrements class and term counts", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(createStudent());

        const result = await disableStudent(input);

        expect(result).toEqual({
            success: true,
            message: "ปิดใช้งานนักเรียนสำเร็จ",
        });
        expect(prismaMocks.tx.student.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: input.id },
                data: expect.objectContaining({ disabledAt: expect.any(Date) }),
            }),
        );
        expect(prismaMocks.tx.schoolClass.updateMany).toHaveBeenCalledWith({
            where: { id: "class-1", expectedStudentCount: { gte: 1 } },
            data: { expectedStudentCount: { decrement: 1 } },
        });
        expect(prismaMocks.tx.schoolClassTerm.updateMany).toHaveBeenCalledWith({
            where: { id: "term-1", expectedStudentCount: { gte: 1 } },
            data: { expectedStudentCount: { decrement: 1 } },
        });
        expect(prismaMocks.tx.dataManagementEvent.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    action: "DISABLE",
                    impactSnapshot: expect.objectContaining({
                        lifecycle: expect.objectContaining({ classCountDelta: -1 }),
                    }),
                }),
            }),
        );
        expect(cacheMocks.revalidateStudentsCache).toHaveBeenCalledWith(
            "cmschool0000000000000001",
            input.id,
        );
    });

    it.each(["GRADUATED", "RESIGNED", "TRANSFERRED"] as const)(
        "disables excluded status %s without changing counts",
        async (status) => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(
            createStudent({ status, disabledAt: null }),
        );

        const result = await disableStudent(input);

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.student.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ disabledAt: expect.any(Date) }),
            }),
        );
        expect(prismaMocks.tx.schoolClass.updateMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.schoolClassTerm.updateMany).not.toHaveBeenCalled();
        },
    );

    it("restores an active-status disabled student and increments class and term counts", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(
            createStudent({ disabledAt: new Date("2026-07-14T00:00:00.000Z") }),
        );

        const result = await restoreStudent(input);

        expect(result).toEqual({ success: true, message: "กู้คืนนักเรียนสำเร็จ" });
        expect(prismaMocks.tx.schoolClass.updateMany).toHaveBeenCalledWith({
            where: { id: "class-1" },
            data: { expectedStudentCount: { increment: 1 } },
        });
        expect(prismaMocks.tx.schoolClassTerm.updateMany).toHaveBeenCalledWith({
            where: { id: "term-1" },
            data: { expectedStudentCount: { increment: 1 } },
        });
    });

    it("restores excluded status without changing counts", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(
            createStudent({
                status: "GRADUATED",
                disabledAt: new Date("2026-07-14T00:00:00.000Z"),
            }),
        );

        const result = await restoreStudent(input);

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.schoolClass.updateMany).not.toHaveBeenCalled();
        expect(prismaMocks.tx.schoolClassTerm.updateMany).not.toHaveBeenCalled();
    });

    it("returns an integrity failure without cache invalidation when decrement is guarded out", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(createStudent());
        prismaMocks.tx.schoolClass.updateMany.mockResolvedValue({ count: 0 });

        const result = await disableStudent(input);

        expect(result).toEqual({
            success: false,
            message:
                "จำนวนคาดการณ์ของห้องไม่สอดคล้องกับข้อมูลนักเรียน กรุณาตรวจสอบข้อมูลห้องเรียน",
        });
        expect(prismaMocks.tx.dataManagementEvent.create).not.toHaveBeenCalled();
        expect(cacheMocks.revalidateStudentsCache).not.toHaveBeenCalled();
    });

    it("does not revalidate when audit creation fails after count adjustment", async () => {
        prismaMocks.tx.student.findUnique.mockResolvedValue(createStudent());
        prismaMocks.tx.dataManagementEvent.create.mockRejectedValue(
            new Error("audit failed"),
        );

        await expect(disableStudent(input)).rejects.toThrow("audit failed");
        expect(cacheMocks.revalidateStudentsCache).not.toHaveBeenCalled();
    });
});

function createStudent(
    overrides: Partial<{
        status: "ACTIVE" | "RESIGNED" | "TRANSFERRED" | "GRADUATED";
        disabledAt: Date | null;
    }> = {},
) {
    return {
        id: input.id,
        studentId: "1001",
        firstName: "สมชาย",
        lastName: "ใจดี",
        schoolId: "cmschool0000000000000001",
        class: "ป.6/1",
        status: overrides.status ?? "ACTIVE",
        disabledAt: overrides.disabledAt ?? null,
        isTestData: false,
        updatedAt: new Date("2026-07-14T00:00:00.000Z"),
        school: {
            id: "cmschool0000000000000001",
            name: "โรงเรียนทดสอบ",
            isTestData: false,
            disabledAt: null,
        },
    };
}
