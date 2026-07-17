import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        counselingSession: {
            findFirst: vi.fn(),
            create: vi.fn(),
            updateMany: vi.fn(),
            findUniqueOrThrow: vi.fn(),
        },
        homeVisit: {
            findFirst: vi.fn(),
            create: vi.fn(),
            updateMany: vi.fn(),
            findUniqueOrThrow: vi.fn(),
        },
        systemAdminEvent: { create: vi.fn() },
    };
    return {
        transaction: vi.fn(),
        counselingFindFirst: vi.fn(),
        homeVisitFindFirst: vi.fn(),
        phqResultFindFirst: vi.fn(),
        tx,
    };
});

const cacheMocks = vi.hoisted(() => ({
    revalidateStudentsCache: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        $transaction: prismaMocks.transaction,
        counselingSession: { findFirst: prismaMocks.counselingFindFirst },
        homeVisit: { findFirst: prismaMocks.homeVisitFindFirst },
        phqResult: { findFirst: prismaMocks.phqResultFindFirst },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: cacheMocks.revalidateStudentsCache,
}));

import type { Actor } from "@/lib/actions/system-admin/mutations";
import {
    saveSystemCounselingRecord,
    saveSystemHomeVisitRecord,
    softDeleteSystemCareRecord,
} from "@/lib/actions/system-admin/care-records";

const actor: Actor = {
    id: "cmadmin00000000000000001",
    email: "admin@example.com",
    name: "ผู้ดูแลระบบ",
    role: "system_admin",
};

const studentId = "cmstudent0000000000000001";
const schoolId = "cmschool0000000000000001";

describe("system admin care record mutations", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.transaction.mockImplementation(
            async (callback: (tx: typeof prismaMocks.tx) => Promise<unknown>) =>
                callback(prismaMocks.tx),
        );
        prismaMocks.tx.counselingSession.updateMany.mockResolvedValue({ count: 1 });
        prismaMocks.tx.homeVisit.updateMany.mockResolvedValue({ count: 1 });
        prismaMocks.phqResultFindFirst.mockResolvedValue({
            academicYearId: "cmacademicyear000000000001",
        });
    });

    it("does not reuse a soft-deleted counseling session number", async () => {
        prismaMocks.tx.counselingSession.findFirst.mockImplementation(
            ({ where }: { where: { deletedAt?: null } }) =>
                Promise.resolve(where.deletedAt === null
                    ? { sessionNumber: 1 }
                    : { sessionNumber: 2 }),
        );
        prismaMocks.tx.counselingSession.create.mockResolvedValue(
            createCounselingRow(3),
        );

        const result = await saveSystemCounselingRecord(
            {
                studentId,
                sessionDate: new Date("2026-07-07T00:00:00.000Z"),
                counselorName: "ครูแนะแนว",
                summary: "บันทึกใหม่หลังลบรายการเดิม",
                reason: "เพิ่มรายการใหม่หลังลบแบบกู้คืนได้",
            },
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.counselingSession.findFirst).toHaveBeenCalledWith({
            where: { studentId },
            orderBy: { sessionNumber: "desc" },
            select: { sessionNumber: true },
        });
        expect(prismaMocks.tx.counselingSession.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                studentId,
                sessionNumber: 3,
                createdById: actor.id,
            }),
            select: expect.objectContaining({
                student: { select: { schoolId: true } },
            }),
        });
        expect(prismaMocks.tx.systemAdminEvent.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: "CREATE",
                targetType: "counselingSession",
                targetId: "cmcounseling000000000003",
                reason: "เพิ่มรายการใหม่หลังลบแบบกู้คืนได้",
            }),
        });
        expect(cacheMocks.revalidateStudentsCache).toHaveBeenCalledWith(
            schoolId,
            studentId,
        );
    });

    it("does not reuse a soft-deleted home visit number", async () => {
        prismaMocks.tx.homeVisit.findFirst.mockImplementation(
            ({ where }: { where: { deletedAt?: null } }) =>
                Promise.resolve(where.deletedAt === null
                    ? { visitNumber: 1 }
                    : { visitNumber: 2 }),
        );
        prismaMocks.tx.homeVisit.create.mockResolvedValue(createHomeVisitRow(3));

        const result = await saveSystemHomeVisitRecord(
            {
                studentId,
                visitDate: new Date("2026-07-07T00:00:00.000Z"),
                description: "เยี่ยมบ้านหลังลบรายการเดิม",
                nextScheduledDate: "",
                teacherName: "ครูประจำชั้น",
                teacherRole: "ครูที่ปรึกษา",
                reason: "เพิ่มรายการใหม่หลังลบแบบกู้คืนได้",
            },
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.homeVisit.findFirst).toHaveBeenCalledWith({
            where: { studentId },
            orderBy: { visitNumber: "desc" },
            select: { visitNumber: true },
        });
        expect(prismaMocks.tx.homeVisit.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                studentId,
                visitNumber: 3,
                createdById: actor.id,
            }),
            select: expect.objectContaining({
                student: { select: { schoolId: true } },
            }),
        });
        expect(prismaMocks.tx.systemAdminEvent.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: "CREATE",
                targetType: "homeVisit",
                targetId: "cmhomevisit000000000003",
                reason: "เพิ่มรายการใหม่หลังลบแบบกู้คืนได้",
            }),
        });
        expect(cacheMocks.revalidateStudentsCache).toHaveBeenCalledWith(
            schoolId,
            studentId,
        );
    });

    it("retries counseling creation after a concurrent number conflict", async () => {
        let attempts = 0;
        prismaMocks.transaction.mockImplementation(async (callback, options) => {
            attempts += 1;
            expect(options).toEqual({ isolationLevel: "Serializable" });
            if (attempts === 1) throw createRetryableError("P2002");
            return callback(prismaMocks.tx);
        });
        prismaMocks.tx.counselingSession.findFirst.mockResolvedValue(null);
        prismaMocks.tx.counselingSession.create.mockResolvedValue(createCounselingRow(1));

        const result = await saveSystemCounselingRecord(
            {
                studentId,
                sessionDate: new Date("2026-07-07T00:00:00.000Z"),
                counselorName: "ครูแนะแนว",
                summary: "บันทึกพร้อม retry",
                reason: "ทดสอบการชนเลขรายการ",
            },
            actor,
        );

        expect(result.success).toBe(true);
        expect(attempts).toBe(2);
    });

    it("retries home visit creation after a serialization conflict", async () => {
        let attempts = 0;
        prismaMocks.transaction.mockImplementation(async (callback, options) => {
            attempts += 1;
            expect(options).toEqual({ isolationLevel: "Serializable" });
            if (attempts === 1) throw createRetryableError("P2034");
            return callback(prismaMocks.tx);
        });
        prismaMocks.tx.homeVisit.findFirst.mockResolvedValue(null);
        prismaMocks.tx.homeVisit.create.mockResolvedValue(createHomeVisitRow(1));

        const result = await saveSystemHomeVisitRecord(
            {
                studentId,
                visitDate: new Date("2026-07-07T00:00:00.000Z"),
                description: "เยี่ยมบ้านพร้อม retry",
                nextScheduledDate: "",
                teacherName: "ครูประจำชั้น",
                teacherRole: "ครูที่ปรึกษา",
                reason: "ทดสอบการชนเลขรายการ",
            },
            actor,
        );

        expect(result.success).toBe(true);
        expect(attempts).toBe(2);
    });

    it("rejects counseling edit when the active record does not belong to the student", async () => {
        prismaMocks.counselingFindFirst.mockResolvedValue(null);

        const result = await saveSystemCounselingRecord(
            {
                id: "cmcounseling000000000099",
                studentId,
                sessionDate: new Date("2026-07-07T00:00:00.000Z"),
                counselorName: "ครูแนะแนว",
                summary: "แก้ไขบันทึกเดิม",
                reason: "แก้ไขรายละเอียดการให้คำปรึกษา",
            },
            actor,
        );
        expect(prismaMocks.counselingFindFirst).toHaveBeenCalledWith({
            where: {
                id: "cmcounseling000000000099",
                studentId,
                deletedAt: null,
            },
            select: expect.any(Object),
        });
        expect(result).toEqual({ success: false, message: "ไม่พบบันทึกการให้คำปรึกษา" });
        expect(prismaMocks.transaction).not.toHaveBeenCalled();
        expect(prismaMocks.tx.counselingSession.create).not.toHaveBeenCalled();
    });

    it("rejects home visit edit when the active record does not belong to the student", async () => {
        prismaMocks.homeVisitFindFirst.mockResolvedValue(null);

        const result = await saveSystemHomeVisitRecord(
            {
                id: "cmhomevisit000000000099",
                studentId,
                visitDate: new Date("2026-07-07T00:00:00.000Z"),
                description: "แก้ไขบันทึกเดิม",
                nextScheduledDate: "",
                teacherName: "ครูประจำชั้น",
                teacherRole: "ครูที่ปรึกษา",
                reason: "แก้ไขรายละเอียดการเยี่ยมบ้าน",
            },
            actor,
        );

        expect(prismaMocks.homeVisitFindFirst).toHaveBeenCalledWith({
            where: {
                id: "cmhomevisit000000000099",
                studentId,
                deletedAt: null,
            },
            select: expect.any(Object),
        });
        expect(result).toEqual({ success: false, message: "ไม่พบบันทึกการเยี่ยมบ้าน" });
        expect(prismaMocks.transaction).not.toHaveBeenCalled();
        expect(prismaMocks.tx.homeVisit.create).not.toHaveBeenCalled();
    });

    it("records a DELETE audit event when soft deleting a counseling session", async () => {
        prismaMocks.counselingFindFirst.mockResolvedValue(createCounselingRow(1));

        const result = await softDeleteSystemCareRecord(
            "counselingSession",
            {
                id: "cmcounseling000000000001",
                expectedUpdatedAt,
                reason: "ลบรายการซ้ำจากเอกสารเดิม",
            },
            actor,
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.tx.systemAdminEvent.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: "DELETE",
                targetType: "counselingSession",
                targetId: "cmcounseling000000000001",
                reason: "ลบรายการซ้ำจากเอกสารเดิม",
            }),
        });
        expect(cacheMocks.revalidateStudentsCache).toHaveBeenCalledWith(
            schoolId,
            studentId,
        );
    });

    it("invalidates scoped caches when soft deleting a home visit", async () => {
        prismaMocks.homeVisitFindFirst.mockResolvedValue(createHomeVisitRow(1));

        const result = await softDeleteSystemCareRecord(
            "homeVisit",
            {
                id: "cmhomevisit000000000001",
                expectedUpdatedAt,
                reason: "ลบรายการเยี่ยมบ้านซ้ำ",
            },
            actor,
        );

        expect(result.success).toBe(true);
        expect(cacheMocks.revalidateStudentsCache).toHaveBeenCalledWith(
            schoolId,
            studentId,
        );
    });
});

function createCounselingRow(sessionNumber: number) {
    return {
        id: `cmcounseling00000000000${sessionNumber}`,
        studentId,
        academicYearId: "cmacademicyear000000000001",
        academicYear: { year: 2569, semester: 1 },
        sessionNumber,
        sessionDate: new Date("2026-07-07T00:00:00.000Z"),
        counselorName: "ครูแนะแนว",
        summary: "บันทึกใหม่หลังลบรายการเดิม",
        createdAt: new Date("2026-07-07T00:00:00.000Z"),
        updatedAt: expectedUpdatedAt,
        student: { schoolId },
    };
}

function createHomeVisitRow(visitNumber: number) {
    return {
        id: `cmhomevisit00000000000${visitNumber}`,
        studentId,
        academicYearId: "cmacademicyear000000000001",
        academicYear: { year: 2569, semester: 1 },
        visitNumber,
        visitDate: new Date("2026-07-07T00:00:00.000Z"),
        description: "เยี่ยมบ้านหลังลบรายการเดิม",
        nextScheduledDate: null,
        teacherName: "ครูประจำชั้น",
        teacherRole: "ครูที่ปรึกษา",
        createdAt: new Date("2026-07-07T00:00:00.000Z"),
        updatedAt: expectedUpdatedAt,
        _count: { photos: 0 },
        student: { schoolId },
    };
}

function createRetryableError(code: "P2002" | "P2034"): Error & { code: string } {
    return Object.assign(new Error(code), { code });
}

const expectedUpdatedAt = new Date("2026-07-07T00:00:00.000Z");
