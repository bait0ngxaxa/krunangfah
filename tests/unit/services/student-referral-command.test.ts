import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    const tx = {
        studentReferral: {
            create: vi.fn(),
            updateMany: vi.fn(),
        },
        student: {
            updateMany: vi.fn(),
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
});
