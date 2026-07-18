import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    const tx = {
        studentReferral: {
            updateMany: vi.fn(),
            create: vi.fn(),
        },
        student: {
            updateMany: vi.fn(),
        },
        systemAdminEvent: {
            create: vi.fn(),
        },
    };

    return {
        transaction: vi.fn(),
        studentFindUnique: vi.fn(),
        teacherFindFirst: vi.fn(),
        referralFindFirst: vi.fn(),
        referralFindUnique: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        tx,
    };
});

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        $transaction: mocks.transaction,
        student: { findUnique: mocks.studentFindUnique },
        teacher: { findFirst: mocks.teacherFindFirst },
        studentReferral: {
            findFirst: mocks.referralFindFirst,
            findUnique: mocks.referralFindUnique,
        },
    },
}));

vi.mock("@/lib/actions/system-admin/events", () => ({
    createSystemAdminEditEvent: vi.fn(),
}));

vi.mock("@/lib/actions/system-admin/care-records-selects", () => ({
    REFERRAL_SELECT: {},
    toReferralRecord: vi.fn((row: unknown) => row),
}));

vi.mock("@/lib/actions/system-admin/care-records-concurrency", () => ({
    staleCareRecordResponse: vi.fn(() => ({
        success: false,
        message: "stale",
    })),
}));

vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: vi.fn(),
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import {
    deleteSystemReferral,
    saveSystemReferral,
} from "@/lib/actions/system-admin/care-records-admin";

const actor = {
    id: "cmadmin00000000000000001",
    email: "admin@example.com",
    name: "Admin",
    role: "system_admin" as const,
};

const studentId = "cmstudent0000000000000001";
const referralId = "cmreferral000000000000001";
const expectedUpdatedAt = new Date("2026-07-07T00:00:00.000Z");

describe("system admin referral transaction invariants", () => {
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

    it("rolls back delete when the active referral pointer cannot be released", async () => {
        mocks.referralFindUnique.mockResolvedValue({
            ...createReferralRow(),
            student: { schoolId: "cmschool000000000000001" },
        });
        mocks.tx.studentReferral.updateMany.mockResolvedValue({ count: 1 });
        mocks.tx.student.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            deleteSystemReferral(
                {
                    id: referralId,
                    expectedUpdatedAt,
                    reason: "delete referral",
                },
                actor,
            ),
        ).rejects.toThrow("Active referral pointer could not be released");

        expect(mocks.commit).not.toHaveBeenCalled();
        expect(mocks.rollback).toHaveBeenCalledOnce();
    });

    it("rolls back replace when closing succeeds but pointer release fails", async () => {
        mocks.studentFindUnique.mockResolvedValue({
            id: studentId,
            schoolId: "cmschool000000000000001",
        });
        mocks.teacherFindFirst.mockResolvedValue({ userId: "cmteacher000000000000002" });
        mocks.referralFindFirst.mockResolvedValue(createReferralRow());
        mocks.tx.studentReferral.updateMany.mockResolvedValue({ count: 1 });
        mocks.tx.student.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            saveSystemReferral(
                {
                    studentId,
                    toTeacherUserId: "cmteacher000000000000002",
                    expectedUpdatedAt,
                    reason: "replace referral",
                },
                actor,
            ),
        ).rejects.toThrow("Active referral pointer could not be released");

        expect(mocks.commit).not.toHaveBeenCalled();
        expect(mocks.rollback).toHaveBeenCalledOnce();
        expect(mocks.tx.studentReferral.create).not.toHaveBeenCalled();
    });

    it("rolls back create when claiming the active referral pointer fails", async () => {
        mocks.studentFindUnique.mockResolvedValue({
            id: studentId,
            schoolId: "cmschool000000000000001",
        });
        mocks.teacherFindFirst.mockResolvedValue({ userId: "cmteacher000000000000002" });
        mocks.referralFindFirst.mockResolvedValue(null);
        mocks.tx.studentReferral.create.mockResolvedValue(createReferralRow());
        mocks.tx.student.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            saveSystemReferral(
                {
                    studentId,
                    toTeacherUserId: "cmteacher000000000000002",
                    reason: "create referral",
                },
                actor,
            ),
        ).rejects.toThrow("Active referral pointer could not be claimed");

        expect(mocks.commit).not.toHaveBeenCalled();
        expect(mocks.rollback).toHaveBeenCalledOnce();
    });
});

function createReferralRow() {
    return {
        id: referralId,
        studentId,
        fromTeacherUserId: "cmteacher000000000000001",
        toTeacherUserId: "cmteacher000000000000002",
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        updatedAt: expectedUpdatedAt,
        student: { schoolId: "cmschool000000000000001" },
        fromTeacher: { teacher: { firstName: "From", lastName: "Teacher" } },
        toTeacher: { teacher: { firstName: "To", lastName: "Teacher" } },
    };
}
