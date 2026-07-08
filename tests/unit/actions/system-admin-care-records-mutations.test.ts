import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => {
    const tx = {
        counselingSession: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        homeVisit: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        systemAdminEvent: { create: vi.fn() },
    };
    return {
        transaction: vi.fn(),
        counselingFindFirst: vi.fn(),
        homeVisitFindFirst: vi.fn(),
        tx,
    };
});

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        $transaction: prismaMocks.transaction,
        counselingSession: { findFirst: prismaMocks.counselingFindFirst },
        homeVisit: { findFirst: prismaMocks.homeVisitFindFirst },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: vi.fn(),
}));

import type { Actor } from "@/lib/actions/system-admin/mutations";
import {
    saveSystemCounselingRecord,
    saveSystemHomeVisitRecord,
} from "@/lib/actions/system-admin/care-records";

const actor: Actor = {
    id: "cmadmin00000000000000001",
    email: "admin@example.com",
    name: "ผู้ดูแลระบบ",
    role: "system_admin",
};

const studentId = "cmstudent0000000000000001";

describe("system admin care record mutations", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.transaction.mockImplementation(
            async (callback: (tx: typeof prismaMocks.tx) => Promise<unknown>) =>
                callback(prismaMocks.tx),
        );
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
            select: expect.any(Object),
        });
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
            select: expect.any(Object),
        });
    });
});

function createCounselingRow(sessionNumber: number) {
    return {
        id: `cmcounseling00000000000${sessionNumber}`,
        studentId,
        sessionNumber,
        sessionDate: new Date("2026-07-07T00:00:00.000Z"),
        counselorName: "ครูแนะแนว",
        summary: "บันทึกใหม่หลังลบรายการเดิม",
        createdAt: new Date("2026-07-07T00:00:00.000Z"),
    };
}

function createHomeVisitRow(visitNumber: number) {
    return {
        id: `cmhomevisit00000000000${visitNumber}`,
        studentId,
        visitNumber,
        visitDate: new Date("2026-07-07T00:00:00.000Z"),
        description: "เยี่ยมบ้านหลังลบรายการเดิม",
        nextScheduledDate: null,
        teacherName: "ครูประจำชั้น",
        teacherRole: "ครูที่ปรึกษา",
        createdAt: new Date("2026-07-07T00:00:00.000Z"),
        _count: { photos: 0 },
    };
}
