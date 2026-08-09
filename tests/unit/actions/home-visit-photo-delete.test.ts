import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    findUnique: vi.fn(),
    userFindUnique: vi.fn(),
    hardDelete: vi.fn(),
    transaction: vi.fn(),
    transactionDelete: vi.fn(),
    enqueueCleanup: vi.fn(),
    canAccessStudentByRole: vi.fn(),
    existsSync: vi.fn(),
    unlink: vi.fn(),
    logError: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        homeVisitPhoto: {
            findUnique: mocks.findUnique,
            delete: mocks.hardDelete,
        },
        user: { findUnique: mocks.userFindUnique },
        $transaction: mocks.transaction,
    },
}));
vi.mock("fs", () => ({ existsSync: mocks.existsSync }));
vi.mock("fs/promises", () => ({
    mkdir: vi.fn(),
    unlink: mocks.unlink,
    writeFile: vi.fn(),
}));
vi.mock("@/lib/security/student-access", () => ({
    canAccessStudentByRole: mocks.canAccessStudentByRole,
}));
vi.mock("@/lib/actions/care-record-current-policy", () => ({
    canMutateAcademicYearContext: vi.fn(async () => true),
    LATEST_CARE_RECORD_ONLY_MESSAGE:
        "แก้ไขข้อมูลได้เฉพาะผลคัดกรองล่าสุดของนักเรียน",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/utils/logging", () => ({ logError: mocks.logError }));

const { deleteHomeVisitPhoto } = await import(
    "@/lib/actions/home-visit-photo.actions"
);

describe("deleteHomeVisitPhoto", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({
            user: { id: "teacher-1", role: "class_teacher" },
        });
        mocks.findUnique.mockResolvedValue({
            id: "photo-1",
            fileUrl: "/api/uploads/home-visits/photo.png",
            homeVisit: {
                studentId: "student-1",
                student: {
                    schoolId: "school-1",
                    class: "ม.1/1",
                    status: "ACTIVE",
                },
            },
        });
        mocks.userFindUnique.mockResolvedValue({
            schoolId: "school-1",
            role: "class_teacher",
            teacher: { advisoryClass: "ม.1/1" },
        });
        mocks.canAccessStudentByRole.mockReturnValue(true);
        mocks.existsSync.mockReturnValue(true);
        mocks.unlink.mockResolvedValue(undefined);
        mocks.hardDelete.mockResolvedValue({ id: "photo-1" });
        mocks.transactionDelete.mockResolvedValue({ id: "photo-1" });
        mocks.enqueueCleanup.mockResolvedValue({ count: 1 });
        mocks.transaction.mockImplementation(
            async (callback: (tx: unknown) => Promise<unknown>) =>
                callback({
                    homeVisitPhoto: { delete: mocks.transactionDelete },
                    fileDeletionOutbox: { createMany: mocks.enqueueCleanup },
                }),
        );
    });

    it("deletes metadata and queues physical cleanup atomically", async () => {
        const result = await deleteHomeVisitPhoto("photo-1");

        expect(result).toEqual({ success: true, message: "ลบรูปภาพสำเร็จ" });
        expect(mocks.transaction).toHaveBeenCalledOnce();
        expect(mocks.transactionDelete).toHaveBeenCalledWith({
            where: { id: "photo-1" },
        });
        expect(mocks.enqueueCleanup).toHaveBeenCalledWith({
            data: [{ fileUrl: "/api/uploads/home-visits/photo.png" }],
            skipDuplicates: true,
        });
        expect(mocks.hardDelete).not.toHaveBeenCalled();
        expect(mocks.unlink).not.toHaveBeenCalled();
    });
});
