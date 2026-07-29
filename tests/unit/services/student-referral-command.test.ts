import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    const tx = {
        studentReferral: {
            create: vi.fn(),
            findUnique: vi.fn(),
            updateMany: vi.fn(),
        },
        student: {
            findUnique: vi.fn(),
            updateMany: vi.fn(),
        },
        user: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
        },
    };

    return {
        transaction: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        tx,
    };
});

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        $transaction: mocks.transaction,
    },
}));

import {
    createActiveStudentReferral,
    revokeActiveStudentReferral,
} from "@/lib/services/student-referral-command";

describe("student referral transaction invariants", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.transaction.mockImplementation(
            async (callback: (tx: typeof mocks.tx) => Promise<unknown>) => {
                try {
                    const result = await callback(mocks.tx);
                    mocks.commit();
                    return result;
                } catch (error) {
                    mocks.rollback();
                    throw error;
                }
            },
        );
    });

    it("rolls back revoke when the active referral pointer cannot be released", async () => {
        mocks.tx.studentReferral.findUnique.mockResolvedValue({
            fromTeacherUserId: "cmteacher000000000000001",
            student: { schoolId: "school-1" },
        });
        mocks.tx.user.findUnique.mockResolvedValue({
            role: "class_teacher",
            schoolId: "school-1",
            deletedAt: null,
            school: { disabledAt: null },
        });
        mocks.tx.studentReferral.updateMany.mockResolvedValue({ count: 1 });
        mocks.tx.student.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            revokeActiveStudentReferral({
                referralId: "cmreferral000000000000001",
                revokedById: "cmteacher000000000000001",
            }),
        ).rejects.toThrow("Active referral pointer could not be released");

        expect(mocks.commit).not.toHaveBeenCalled();
        expect(mocks.rollback).toHaveBeenCalledOnce();
    });

    it("rolls back create when the active referral pointer cannot be claimed", async () => {
        const referral = {
            id: "cmreferral000000000000001",
            studentId: "cmstudent0000000000000001",
            fromTeacherUserId: "cmteacher000000000000001",
            toTeacherUserId: "cmteacher000000000000002",
            createdAt: new Date("2026-07-01T00:00:00.000Z"),
        };
        mocks.tx.student.findUnique.mockResolvedValue({
            id: referral.studentId,
            schoolId: "school-1",
            class: "ม.1/1",
            status: "ACTIVE",
            disabledAt: null,
            school: { disabledAt: null },
        });
        mocks.tx.user.findUnique.mockResolvedValue({
            role: "class_teacher",
            schoolId: "school-1",
            deletedAt: null,
            school: { disabledAt: null },
            teacher: { advisoryClass: "ม.1/1" },
        });
        mocks.tx.user.findFirst.mockResolvedValue({ id: referral.toTeacherUserId });
        mocks.tx.studentReferral.create.mockResolvedValue(referral);
        mocks.tx.student.updateMany.mockResolvedValue({ count: 0 });

        const result = await createActiveStudentReferral({
            studentId: referral.studentId,
            fromTeacherUserId: referral.fromTeacherUserId,
            toTeacherUserId: referral.toTeacherUserId,
        });

        expect(result).toBeNull();
        expect(mocks.commit).not.toHaveBeenCalled();
        expect(mocks.rollback).toHaveBeenCalledOnce();
    });

    it("rechecks the target school inside the transaction before creating", async () => {
        mocks.tx.student.findUnique.mockResolvedValue({
            id: "cmstudent0000000000000001",
            schoolId: "school-1",
            class: "ม.1/1",
            status: "ACTIVE",
            disabledAt: null,
            school: { disabledAt: null },
        });
        mocks.tx.user.findUnique.mockResolvedValue({
            role: "class_teacher",
            schoolId: "school-1",
            deletedAt: null,
            school: { disabledAt: null },
            teacher: { advisoryClass: "ม.1/1" },
        });
        // The target was moved to school B before the transactional re-check.
        mocks.tx.user.findFirst.mockResolvedValue(null);

        const result = await createActiveStudentReferral({
            studentId: "cmstudent0000000000000001",
            fromTeacherUserId: "cmteacher000000000000001",
            toTeacherUserId: "cmteacher0000000000000002",
        });

        expect(result).toBeNull();
        expect(mocks.tx.studentReferral.create).not.toHaveBeenCalled();
        expect(mocks.tx.student.updateMany).not.toHaveBeenCalled();
        expect(mocks.commit).toHaveBeenCalledOnce();
    });

    it.each([
        ["a blocked status", "GRADUATED", null, null],
        ["a disabled student", "ACTIVE", new Date("2026-07-01"), null],
        ["a disabled school", "ACTIVE", null, new Date("2026-07-01")],
    ] as const)(
        "does not create a referral for %s during the transaction re-check",
        async (_caseName, status, studentDisabledAt, schoolDisabledAt) => {
            mocks.tx.student.findUnique.mockResolvedValue({
                id: "cmstudent0000000000000001",
                schoolId: "school-1",
                class: "ม.1/1",
                status,
                disabledAt: studentDisabledAt,
                school: { disabledAt: schoolDisabledAt },
            });

            const result = await createActiveStudentReferral({
                studentId: "cmstudent0000000000000001",
                fromTeacherUserId: "cmteacher000000000000001",
                toTeacherUserId: "cmteacher0000000000000002",
            });

            expect(result).toBeNull();
            expect(mocks.tx.studentReferral.create).not.toHaveBeenCalled();
        },
    );

    it("does not revoke when the original class_teacher moved schools", async () => {
        mocks.tx.studentReferral.findUnique.mockResolvedValue({
            fromTeacherUserId: "cmteacher000000000000001",
            student: { schoolId: "school-1" },
        });
        mocks.tx.user.findUnique.mockResolvedValue({
            role: "class_teacher",
            schoolId: "school-2",
            deletedAt: null,
            school: { disabledAt: null },
        });

        const result = await revokeActiveStudentReferral({
            referralId: "cmreferral000000000000001",
            revokedById: "cmteacher000000000000001",
        });

        expect(result).toBe(false);
        expect(mocks.tx.studentReferral.updateMany).not.toHaveBeenCalled();
        expect(mocks.tx.student.updateMany).not.toHaveBeenCalled();
    });
});
