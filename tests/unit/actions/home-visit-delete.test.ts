import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    findUnique: vi.fn(),
    hardDelete: vi.fn(),
    softDelete: vi.fn(),
    transactionHomeVisitFindUnique: vi.fn(),
    enqueueCleanup: vi.fn(),
    transaction: vi.fn(),
    requireAuth: vi.fn(),
    verifyAccess: vi.fn(),
    unlink: vi.fn(),
    logError: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        homeVisit: {
            findUnique: mocks.findUnique,
            delete: mocks.hardDelete,
        },
        $transaction: mocks.transaction,
    },
}));
vi.mock("@/lib/auth/session", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/security/student-access", () => ({
    verifyStudentAccessForUser: mocks.verifyAccess,
}));
vi.mock("@/lib/actions/care-record-current-policy", () => ({
    canMutateAcademicYearContext: vi.fn(async () => true),
    LATEST_CARE_RECORD_ONLY_MESSAGE:
        "แก้ไขข้อมูลได้เฉพาะผลคัดกรองล่าสุดของนักเรียน",
}));
vi.mock("fs/promises", () => ({ unlink: mocks.unlink }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/utils/logging", () => ({ logError: mocks.logError }));

const { deleteHomeVisit } = await import("@/lib/actions/home-visit.actions");

describe("deleteHomeVisit", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireAuth.mockResolvedValue({
            user: { id: "teacher-1", role: "class_teacher" },
        });
        mocks.verifyAccess.mockResolvedValue({ allowed: true });
        mocks.findUnique.mockResolvedValue({
            studentId: "student-1",
            photos: [
                { fileUrl: "/api/uploads/home-visits/photo-one.webp" },
                { fileUrl: "/api/uploads/home-visits/photo-two.webp" },
            ],
        });
        mocks.transaction.mockImplementation(
            async (callback: (tx: unknown) => Promise<unknown>) =>
                callback({
                    homeVisit: {
                        findUnique: mocks.transactionHomeVisitFindUnique,
                        update: mocks.softDelete,
                    },
                    fileDeletionOutbox: { createMany: mocks.enqueueCleanup },
                }),
        );
        mocks.softDelete.mockResolvedValue({ id: "cvisit123" });
        mocks.transactionHomeVisitFindUnique.mockResolvedValue({
            studentId: "student-1",
            academicYearId: "academic-year-1",
            photos: [
                { fileUrl: "/api/uploads/home-visits/photo-one.webp" },
                { fileUrl: "/api/uploads/home-visits/photo-two.webp" },
            ],
        });
        mocks.enqueueCleanup.mockResolvedValue({ count: 2 });
    });

    it("soft deletes and enqueues every photo atomically without touching files", async () => {
        const result = await deleteHomeVisit("cvisit123");

        expect(result).toEqual({ success: true });
        expect(mocks.transaction).toHaveBeenCalledOnce();
        expect(mocks.softDelete).toHaveBeenCalledWith({
            where: { id: "cvisit123" },
            data: {
                deletedAt: expect.any(Date),
                deletedById: "teacher-1",
                deleteReason: "ผู้ใช้ลบบันทึกเยี่ยมบ้าน",
            },
        });
        expect(mocks.enqueueCleanup).toHaveBeenCalledWith({
            data: [
                { fileUrl: "/api/uploads/home-visits/photo-one.webp" },
                { fileUrl: "/api/uploads/home-visits/photo-two.webp" },
            ],
            skipDuplicates: true,
        });
        expect(mocks.hardDelete).not.toHaveBeenCalled();
        expect(mocks.unlink).not.toHaveBeenCalled();
    });

    it("does not touch files when enqueueing makes the transaction fail", async () => {
        mocks.enqueueCleanup.mockRejectedValue(new Error("outbox unavailable"));

        const result = await deleteHomeVisit("cvisit123");

        expect(result).toEqual({
            success: false,
            message: "เกิดข้อผิดพลาดในการลบข้อมูล",
        });
        expect(mocks.softDelete).toHaveBeenCalledOnce();
        expect(mocks.enqueueCleanup).toHaveBeenCalledOnce();
        expect(mocks.hardDelete).not.toHaveBeenCalled();
        expect(mocks.unlink).not.toHaveBeenCalled();
    });

    it("reads the photo snapshot inside the deletion transaction", async () => {
        mocks.findUnique.mockResolvedValue({ studentId: "student-1" });

        const result = await deleteHomeVisit("cvisit123");

        expect(result).toEqual({ success: true });
        expect(mocks.transactionHomeVisitFindUnique).toHaveBeenCalledWith({
            where: { id: "cvisit123", deletedAt: null },
            select: {
                studentId: true,
                academicYearId: true,
                photos: { select: { fileUrl: true } },
            },
        });
        expect(mocks.enqueueCleanup).toHaveBeenCalledWith({
            data: [
                { fileUrl: "/api/uploads/home-visits/photo-one.webp" },
                { fileUrl: "/api/uploads/home-visits/photo-two.webp" },
            ],
            skipDuplicates: true,
        });
    });
});
