import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedStudent } from "@/lib/utils/excel-parser";

const mocks = vi.hoisted(() => ({
    requireAuth: vi.fn(),
    userFindUnique: vi.fn(),
    schoolClassFindMany: vi.fn(),
    transaction: vi.fn(),
    studentFindMany: vi.fn(),
    studentCreateMany: vi.fn(),
    studentUpdate: vi.fn(),
    phqResultFindMany: vi.fn(),
    phqResultCreateMany: vi.fn(),
    activityProgressCreateMany: vi.fn(),
    ensureSchoolClassTermsForAcademicYear: vi.fn(),
    startIdempotentOperation: vi.fn(),
    completeIdempotentOperation: vi.fn(),
    clearIdempotentOperation: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        user: { findUnique: mocks.userFindUnique },
        schoolClass: { findMany: mocks.schoolClassFindMany },
        phqResult: { count: vi.fn() },
        $transaction: mocks.transaction,
    },
}));
vi.mock("@/lib/services/school-class-term-service", () => ({
    ensureSchoolClassTermsForAcademicYear:
        mocks.ensureSchoolClassTermsForAcademicYear,
}));
vi.mock("@/lib/cache/redis-idempotency", () => ({
    startIdempotentOperation: mocks.startIdempotentOperation,
    completeIdempotentOperation: mocks.completeIdempotentOperation,
    clearIdempotentOperation: mocks.clearIdempotentOperation,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

const { importStudents } = await import("@/lib/actions/student/mutations");

const importedRow: ParsedStudent = {
    studentId: "1001",
    nationalId: "1234567890123",
    firstName: "สมชาย",
    lastName: "ใจดี",
    gender: "MALE",
    age: 13,
    class: "ม.1/1",
    scores: {
        q1: 0,
        q2: 0,
        q3: 0,
        q4: 0,
        q5: 0,
        q6: 0,
        q7: 0,
        q8: 0,
        q9: 0,
        q9a: false,
        q9b: false,
    },
};

const existingStudent = {
    id: "student-db-1",
    schoolId: "school-1",
    studentId: "1001",
    nationalId: "9999999999999",
    firstName: "สมชาย",
    lastName: "ใจดี",
    gender: "FEMALE",
    age: 12,
    class: "ม.1/1",
};

function mockTransaction(): void {
    mocks.transaction.mockImplementation(async (callback) =>
        callback({
            student: {
                findMany: mocks.studentFindMany,
                createMany: mocks.studentCreateMany,
                update: mocks.studentUpdate,
            },
            phqResult: {
                findMany: mocks.phqResultFindMany,
                createMany: mocks.phqResultCreateMany,
            },
            activityProgress: {
                createMany: mocks.activityProgressCreateMany,
            },
        }),
    );
}

function expectIdentityConflict(result: Awaited<ReturnType<typeof importStudents>>): void {
    expect(result).toMatchObject({
        success: false,
        imported: 0,
        identityConflicts: 1,
    });
    expect(mocks.studentCreateMany).not.toHaveBeenCalled();
    expect(mocks.studentUpdate).not.toHaveBeenCalled();
    expect(mocks.phqResultCreateMany).not.toHaveBeenCalled();
}

describe("importStudents identity reconciliation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.studentFindMany.mockReset();
        mocks.requireAuth.mockResolvedValue({
            user: { id: "user-1", role: "school_admin" },
        });
        mocks.userFindUnique.mockResolvedValue({ schoolId: "school-1", teacher: null });
        mocks.schoolClassFindMany.mockResolvedValue([{ name: "ม.1/1" }]);
        mocks.ensureSchoolClassTermsForAcademicYear.mockResolvedValue("ay-1");
        mocks.startIdempotentOperation.mockResolvedValue({ status: "started" });
        mocks.completeIdempotentOperation.mockResolvedValue(undefined);
        mocks.clearIdempotentOperation.mockResolvedValue(undefined);
        mocks.phqResultFindMany.mockResolvedValue([]);
        mocks.studentCreateMany.mockResolvedValue({ count: 0 });
        mocks.studentUpdate.mockResolvedValue(existingStudent);
        mocks.phqResultCreateMany.mockResolvedValue({ count: 1 });
        mockTransaction();
    });

    it("rejects when only the student ID matches an existing student", async () => {
        mocks.studentFindMany
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([existingStudent]);

        const result = await importStudents([importedRow], "ay-input", 1);

        expectIdentityConflict(result);
    });

    it("rejects when only the national ID matches an existing student", async () => {
        const nationalIdOwner = {
            ...existingStudent,
            studentId: "2002",
            nationalId: importedRow.nationalId,
        };
        mocks.studentFindMany
            .mockResolvedValueOnce([nationalIdOwner])
            .mockResolvedValueOnce([]);

        const result = await importStudents([importedRow], "ay-input", 1);

        expectIdentityConflict(result);
    });

    it("updates names and class when both identifiers match the same student", async () => {
        const matchingStudent = {
            ...existingStudent,
            nationalId: importedRow.nationalId,
            firstName: "ชื่อเดิม",
            lastName: "นามสกุลเดิม",
            class: "ม.1/2",
        };
        mocks.studentFindMany
            .mockResolvedValueOnce([matchingStudent])
            .mockResolvedValueOnce([matchingStudent])
            .mockResolvedValueOnce([matchingStudent]);

        const result = await importStudents([importedRow], "ay-input", 1);

        expect(result).toMatchObject({
            success: true,
            imported: 1,
            updatedStudents: 1,
            identityConflicts: 0,
        });
        expect(mocks.studentUpdate).toHaveBeenCalledWith({
            where: { id: matchingStudent.id },
            data: {
                age: importedRow.age,
                class: importedRow.class,
                firstName: importedRow.firstName,
                gender: importedRow.gender,
                lastName: importedRow.lastName,
            },
        });
        expect(mocks.phqResultCreateMany).toHaveBeenCalledOnce();
    });
});
