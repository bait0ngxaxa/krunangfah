import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mockSession, setupAuthMocks, type MockUser } from "./helpers/auth-mock";
import { prisma } from "@/lib/database/prisma";

setupAuthMocks();

const {
    createStudentReferral,
    getReferredOutStudents,
    revokeStudentReferral,
} = await import("@/lib/actions/referral.actions");

interface ReferralHistoryRow {
    id: string;
    toTeacherUserId: string;
    createdAt: Date;
    revokedAt: Date | null;
    revokedById: string | null;
    revokeReason: string | null;
    closedAt: Date | null;
}

describe("Integration: append-only student referrals", () => {
    let schoolId: string;
    let studentId: string;
    let sender: MockUser;
    let firstReceiverId: string;
    let secondReceiverId: string;
    let otherSchoolId: string;

    beforeAll(async () => {
        const suffix = Date.now().toString(36);
        const school = await prisma.school.create({
            data: { name: `โรงเรียนประวัติส่งต่อ-${suffix}` },
        });
        schoolId = school.id;
        const otherSchool = await prisma.school.create({
            data: { name: `โรงเรียนย้ายครู-${suffix}` },
        });
        otherSchoolId = otherSchool.id;

        const users = await Promise.all([
            prisma.user.create({
                data: {
                    email: `sender-${suffix}@test.local`,
                    role: "class_teacher",
                    schoolId,
                },
            }),
            prisma.user.create({
                data: {
                    email: `receiver-1-${suffix}@test.local`,
                    role: "school_admin",
                    schoolId,
                },
            }),
            prisma.user.create({
                data: {
                    email: `receiver-2-${suffix}@test.local`,
                    role: "school_admin",
                    schoolId,
                },
            }),
        ]);

        const [senderUser, firstReceiver, secondReceiver] = users;
        sender = {
            id: senderUser.id,
            name: "ครูผู้ส่ง",
            email: senderUser.email,
            role: "class_teacher",
            schoolId,
        };
        firstReceiverId = firstReceiver.id;
        secondReceiverId = secondReceiver.id;

        await Promise.all([
            prisma.teacher.create({
                data: {
                    userId: senderUser.id,
                    firstName: "ครู",
                    lastName: "ผู้ส่ง",
                    age: 30,
                    advisoryClass: "ม.1/1",
                    schoolRole: "ครูประจำชั้น",
                    projectRole: "care",
                },
            }),
            prisma.teacher.create({
                data: {
                    userId: firstReceiver.id,
                    firstName: "ครู",
                    lastName: "ผู้รับหนึ่ง",
                    age: 35,
                    advisoryClass: "ทุกห้อง",
                    schoolRole: "ครูนางฟ้า",
                    projectRole: "lead",
                },
            }),
            prisma.teacher.create({
                data: {
                    userId: secondReceiver.id,
                    firstName: "ครู",
                    lastName: "ผู้รับสอง",
                    age: 36,
                    advisoryClass: "ทุกห้อง",
                    schoolRole: "ครูนางฟ้า",
                    projectRole: "lead",
                },
            }),
        ]);

        const student = await prisma.student.create({
            data: {
                studentId: `REF-${suffix}`,
                firstName: "นักเรียน",
                lastName: "ประวัติส่งต่อ",
                class: "ม.1/1",
                schoolId,
            },
        });
        studentId = student.id;
    });

    afterAll(async () => {
        await prisma.user.updateMany({
            where: { id: { in: [sender.id, firstReceiverId, secondReceiverId] } },
            data: { schoolId, deletedAt: null },
        });
        await prisma.studentReferral.deleteMany({ where: { studentId } });
        await prisma.student.deleteMany({ where: { id: studentId } });
        await prisma.teacher.deleteMany({
            where: { userId: { in: [sender.id, firstReceiverId, secondReceiverId] } },
        });
        await prisma.user.deleteMany({
            where: { id: { in: [sender.id, firstReceiverId, secondReceiverId] } },
        });
        await prisma.school.deleteMany({ where: { id: schoolId } });
        await prisma.school.deleteMany({ where: { id: otherSchoolId } });
    });

    it("rejects referral when student status changes after outer access check", async () => {
        const outerStudent = await prisma.student.findUnique({
            where: { id: studentId },
        });
        expect(outerStudent?.status).toBe("ACTIVE");
        await prisma.student.update({
            where: { id: studentId },
            data: {
                status: "TRANSFERRED",
                statusChangedAt: new Date(),
                leftAt: new Date(),
            },
        });
        const studentReadSpy = vi
            .spyOn(prisma.student, "findUnique")
            .mockResolvedValueOnce(outerStudent);

        try {
            mockSession(sender);
            const result = await createStudentReferral({
                studentId,
                toTeacherUserId: firstReceiverId,
            });

            expect(result.success).toBe(false);
            expect(
                await prisma.studentReferral.count({ where: { studentId } }),
            ).toBe(0);
        } finally {
            studentReadSpy.mockRestore();
            await prisma.studentReferral.deleteMany({ where: { studentId } });
            await prisma.student.update({
                where: { id: studentId },
                data: {
                    status: "ACTIVE",
                    statusChangedAt: null,
                    leftAt: null,
                },
            });
        }
    });

    it("เก็บผู้รับเดิม createdAt และวันที่เรียกคืนเมื่อส่งต่อใหม่", async () => {
        mockSession(sender);
        const first = await createStudentReferral({
            studentId,
            toTeacherUserId: firstReceiverId,
        });
        expect(first.success).toBe(true);
        expect(first.data).toBeDefined();

        const revoked = await revokeStudentReferral({
            referralId: first.data!.id,
        });
        expect(revoked.success).toBe(true);

        const second = await createStudentReferral({
            studentId,
            toTeacherUserId: secondReceiverId,
        });
        expect(second.success).toBe(true);

        const history = await prisma.$queryRaw<ReferralHistoryRow[]>`
            SELECT
                id,
                "toTeacherUserId",
                "createdAt",
                "revokedAt",
                "revokedById",
                "revokeReason",
                "closedAt"
            FROM student_referrals
            WHERE "studentId" = ${studentId}
            ORDER BY "createdAt" ASC
        `;

        expect(history).toHaveLength(2);
        expect(history.map((row) => row.toTeacherUserId)).toEqual([
            firstReceiverId,
            secondReceiverId,
        ]);
        expect(history[0].id).toBe(first.data!.id);
        expect(history[0].createdAt).toEqual(first.data!.createdAt);
        expect(history[0].revokedAt).toBeInstanceOf(Date);
        expect(history[0].revokedById).toBe(sender.id);
        expect(history[0].revokeReason).toBeNull();
        expect(history[1].revokedAt).toBeNull();
        expect(history[1].closedAt).toBeNull();
    });

    it("does not expose or revoke a referral after the sender changes schools", async () => {
        const current = await prisma.studentReferral.findFirst({
            where: { studentId, revokedAt: null, closedAt: null },
            orderBy: { createdAt: "desc" },
        });
        expect(current).not.toBeNull();

        await prisma.user.update({
            where: { id: sender.id },
            data: { schoolId: otherSchoolId },
        });
        mockSession(sender);

        await expect(getReferredOutStudents()).resolves.toEqual([]);
        await expect(
            revokeStudentReferral({ referralId: current!.id }),
        ).resolves.toMatchObject({ success: false });

        await prisma.user.update({
            where: { id: sender.id },
            data: { schoolId },
        });
        mockSession(sender);
        await expect(
            revokeStudentReferral({ referralId: current!.id }),
        ).resolves.toMatchObject({ success: true });
    });

    it("rejects referrals to a soft-deleted school admin", async () => {
        await prisma.user.update({
            where: { id: firstReceiverId },
            data: { deletedAt: new Date() },
        });
        mockSession(sender);

        const result = await createStudentReferral({
            studentId,
            toTeacherUserId: firstReceiverId,
        });

        expect(result).toMatchObject({ success: false });
        await prisma.user.update({
            where: { id: firstReceiverId },
            data: { deletedAt: null },
        });
    });

    it("concurrent referral สร้าง active row ได้สูงสุดหนึ่งรายการ", async () => {
        const current = await prisma.studentReferral.findFirst({
            where: { studentId },
            orderBy: { createdAt: "desc" },
        });
        expect(current).not.toBeNull();
        await revokeStudentReferral({ referralId: current!.id });

        const results = await Promise.all([
            createStudentReferral({ studentId, toTeacherUserId: firstReceiverId }),
            createStudentReferral({ studentId, toTeacherUserId: secondReceiverId }),
        ]);
        const activeRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*)::bigint AS count
            FROM student_referrals
            WHERE "studentId" = ${studentId}
              AND "revokedAt" IS NULL
              AND "closedAt" IS NULL
        `;

        expect(results.filter((result) => result.success)).toHaveLength(1);
        expect(activeRows[0].count).toBe(BigInt(1));
    });
});
