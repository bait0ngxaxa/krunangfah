/**
 * Regression guards for product decisions requested by the school team
 * (8461f80 / fbcd838): activities exist only for assessment round 1, round 2
 * requires a same-term round-1 PHQ, and incomplete round-1 activities never
 * block a round-2 import.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedStudent } from "@/lib/utils/excel-parser";

const mocks = vi.hoisted(() => ({
    requireAuth: vi.fn(),
    userFindUnique: vi.fn(),
    schoolClassFindMany: vi.fn(),
    schoolPhqCount: vi.fn(),
    transaction: vi.fn(),
    studentFindMany: vi.fn(),
    studentCreateMany: vi.fn(),
    studentUpdate: vi.fn(),
    phqResultFindMany: vi.fn(),
    phqResultCreateMany: vi.fn(),
    activityProgressCreateMany: vi.fn(),
    ensureSchoolClassTermsForAcademicYear: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        user: { findUnique: mocks.userFindUnique },
        schoolClass: { findMany: mocks.schoolClassFindMany },
        phqResult: { count: mocks.schoolPhqCount },
        $transaction: mocks.transaction,
    },
}));
vi.mock("@/lib/services/school-class-term-service", () => ({
    ensureSchoolClassTermsForAcademicYear: mocks.ensureSchoolClassTermsForAcademicYear,
}));
vi.mock("@/lib/services/import-term-policy", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/services/import-term-policy")>()),
    checkImportTerm: vi.fn(async (id: string) => ({
        kind: "allowed" as const,
        term: { id, year: 2569, semester: 1 },
    })),
}));
vi.mock("@/lib/cache/redis-idempotency", () => ({
    startIdempotentOperation: vi.fn(async () => ({ status: "started" })),
    completeIdempotentOperation: vi.fn(),
    clearIdempotentOperation: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/lib/actions/analytics/cache", () => ({ revalidateAnalyticsCache: vi.fn() }));

const { importStudents } = await import("@/lib/actions/student/mutations");

const ROUND_ONE_PHQ = {
    id: "phq-r1",
    assessmentRound: 1,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    academicYear: { startDate: new Date("2026-04-30T17:00:00.000Z"), year: 2569, semester: 1 },
};

const existingStudent = {
    id: "student-db-1",
    schoolId: "school-1",
    studentId: "R-001",
    nationalId: null,
    firstName: "ทดสอบ",
    lastName: "รอบสอง",
    gender: "MALE",
    age: 13,
    class: "ม.1/1",
    phqResults: [ROUND_ONE_PHQ],
};

function row(overrides: Partial<ParsedStudent> = {}): ParsedStudent {
    return {
        studentId: "R-001",
        nationalId: null,
        firstName: "ทดสอบ",
        lastName: "รอบสอง",
        gender: "MALE",
        age: 13,
        class: "ม.1/1",
        scores: { q1: 2, q2: 2, q3: 2, q4: 1, q5: 1, q6: 0, q7: 0, q8: 0, q9: 0, q9a: false, q9b: false },
        ...overrides,
    };
}

interface PhqFindManyArgs {
    where: { assessmentRound: number; studentId: { in: string[] } };
}

/** Same-term PHQ rows by round; round 1 exists only for the given students. */
function mockStoredPhq(roundOneStudentIds: readonly string[], createdRoundOne: readonly string[] = []): void {
    mocks.phqResultFindMany.mockImplementation(async ({ where }: PhqFindManyArgs) => {
        if (where.assessmentRound !== 1) return [];
        const ids = where.studentId.in;
        return [
            ...roundOneStudentIds.filter((id) => ids.includes(id)).map((studentId) => ({ studentId })),
            ...createdRoundOne
                .filter((id) => ids.includes(id))
                .map((studentId) => ({ id: `phq-${studentId}`, studentId, riskLevel: "yellow" })),
        ];
    });
}

describe("import round policy regression guards", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.studentFindMany.mockReset();
        mocks.requireAuth.mockResolvedValue({ user: { id: "user-1", role: "school_admin" } });
        mocks.userFindUnique.mockResolvedValue({ schoolId: "school-1", teacher: null });
        mocks.schoolClassFindMany.mockResolvedValue([{ name: "ม.1/1" }, { name: "ม.1/2" }]);
        mocks.ensureSchoolClassTermsForAcademicYear.mockResolvedValue("ay-1");
        mocks.schoolPhqCount.mockResolvedValue(1);
        mocks.studentCreateMany.mockResolvedValue([]);
        mocks.studentUpdate.mockResolvedValue(existingStudent);
        mocks.phqResultCreateMany.mockImplementation(async ({ data }: { data: unknown[] }) => ({
            count: data.length,
        }));
        mocks.activityProgressCreateMany.mockResolvedValue({ count: 0 });
        mocks.transaction.mockImplementation(async (callback) =>
            // No activityProgress reads: a round-2 import must never consult activity completion.
            callback({
                student: {
                    findMany: mocks.studentFindMany,
                    createManyAndReturn: mocks.studentCreateMany,
                    update: mocks.studentUpdate,
                },
                phqResult: { findMany: mocks.phqResultFindMany, createMany: mocks.phqResultCreateMany },
                activityProgress: { createMany: mocks.activityProgressCreateMany },
            }),
        );
    });

    it("creates activities for a round-1 import", async () => {
        mocks.studentFindMany.mockResolvedValue([]);
        mocks.studentCreateMany.mockResolvedValue([{ id: "student-new", studentId: "R-NEW" }]);
        mockStoredPhq([], ["student-new"]);

        const result = await importStudents([row({ studentId: "R-NEW" })], "ay-1", 1);

        expect(result).toMatchObject({ success: true, phqCreated: 1 });
        expect(mocks.activityProgressCreateMany).toHaveBeenCalledOnce();
    });

    it("never creates activities for a round-2 import, even with incomplete round-1 activities", async () => {
        mocks.studentFindMany.mockResolvedValue([existingStudent]);
        mockStoredPhq([existingStudent.id]);

        const result = await importStudents([row()], "ay-1", 2);

        expect(result).toMatchObject({ success: true, phqCreated: 1, duplicateRoundsSkipped: 0 });
        expect(mocks.phqResultCreateMany).toHaveBeenCalledWith({
            data: [expect.objectContaining({ studentId: existingStudent.id, assessmentRound: 2 })],
        });
        expect(mocks.activityProgressCreateMany).not.toHaveBeenCalled();
    });

    it("updates master data from round 2 of the same term (round 2 is newer)", async () => {
        mocks.studentFindMany.mockResolvedValue([existingStudent]);
        mockStoredPhq([existingStudent.id]);

        const result = await importStudents([row({ class: "ม.1/2" })], "ay-1", 2);

        expect(result).toMatchObject({ success: true, updatedStudents: 1 });
        expect(result).not.toHaveProperty("masterDataPreserved");
        expect(mocks.studentUpdate).toHaveBeenCalledWith({
            where: { id: existingStudent.id },
            data: { class: "ม.1/2" },
        });
    });

    it("rejects round 2 for a student without a same-term round-1 PHQ", async () => {
        mocks.studentFindMany.mockResolvedValue([{ ...existingStudent, phqResults: [] }]);
        mockStoredPhq([]);

        const result = await importStudents([row()], "ay-1", 2);

        expect(result).toMatchObject({ success: false, phqCreated: 0, duplicateRoundsSkipped: 1 });
        expect(result.errors).toEqual([
            expect.stringContaining("ยังไม่มีข้อมูลการประเมินครั้งที่ 1 สำหรับปีการศึกษานี้"),
        ]);
        expect(mocks.phqResultCreateMany).not.toHaveBeenCalled();
    });

    it("rejects round 2 when the school has no round-1 data for the term", async () => {
        mocks.schoolPhqCount.mockResolvedValue(0);

        const result = await importStudents([row()], "ay-1", 2);

        expect(result).toEqual({
            success: false,
            status: "error",
            message: "ปีการศึกษานี้ยังไม่มีข้อมูลการประเมินครั้งที่ 1 จึงยังนำเข้าครั้งที่ 2 ไม่ได้",
        });
        expect(mocks.transaction).not.toHaveBeenCalled();
    });
});
