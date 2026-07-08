import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        student: { findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
        school: { findUnique: vi.fn(), delete: vi.fn() },
        user: { count: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
        teacherInvite: { deleteMany: vi.fn() },
        schoolAdminInvite: { deleteMany: vi.fn() },
        schoolTeacherRoster: { deleteMany: vi.fn() },
        schoolClass: { deleteMany: vi.fn() },
        dataManagementEvent: { create: vi.fn() },
        phqResult: { count: vi.fn() },
        activityProgress: { count: vi.fn() },
        worksheetUpload: { count: vi.fn() },
        counselingSession: { count: vi.fn() },
        studentReferral: { count: vi.fn() },
        homeVisit: { count: vi.fn() },
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
});
