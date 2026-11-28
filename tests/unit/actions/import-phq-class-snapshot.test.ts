/**
 * Each imported PHQ result stores the class from the file, normalized, as
 * its snapshot. It never copies students.class, which a later import or edit
 * may change.
 */
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
}));

vi.mock("@/lib/auth/session", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        user: { findUnique: mocks.userFindUnique },
        schoolClass: { findMany: mocks.schoolClassFindMany },
        phqResult: { count: vi.fn(async () => 1) },
        $transaction: mocks.transaction,
    },
}));
vi.mock("@/lib/services/school-class-term-service", () => ({
    ensureSchoolClassTermsForAcademicYear: vi.fn(async () => "ay-1"),
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

const storedStudent = {
    id: "student-db-1",
    schoolId: "school-1",
    studentId: "S-001",
    nationalId: null,
    firstName: "ทดสอบ",
    lastName: "ห้องเดิม",
    gender: "MALE",
    age: 13,
    class: "ม.1/2",
    phqResults: [
        {
            id: "phq-r1",
            assessmentRound: 1,
            createdAt: new Date("2026-06-01T00:00:00.000Z"),
            academicYear: { startDate: new Date("2026-04-30T17:00:00.000Z"), year: 2569, semester: 1 },
        },
    ],
};

function row(overrides: Partial<ParsedStudent>): ParsedStudent {
    return {
        studentId: "S-001",
        nationalId: null,
        firstName: "ทดสอบ",
        lastName: "ห้องเดิม",
        gender: "MALE",
        age: 13,
        class: "ม.1/1",
        scores: { q1: 1, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q9a: false, q9b: false },
        ...overrides,
    };
}

function createdClassNames(): unknown[] {
    const [call] = mocks.phqResultCreateMany.mock.calls;
    const data = (call?.[0] as { data: Array<{ className?: unknown }> } | undefined)?.data ?? [];
    return data.map((record) => record.className);
}

describe("import stores the file's class on each PHQ result", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireAuth.mockResolvedValue({ user: { id: "user-1", role: "school_admin" } });
        mocks.userFindUnique.mockResolvedValue({ schoolId: "school-1", teacher: null });
        mocks.schoolClassFindMany.mockResolvedValue([{ name: "ม.1/1" }, { name: "ม.1/2" }]);
        mocks.studentUpdate.mockResolvedValue(storedStudent);
        mocks.phqResultFindMany.mockImplementation(async ({ where }: {
            where: { assessmentRound: number; studentId: { in: string[] } };
        }) => (where.assessmentRound === 1 && where.studentId.in.includes(storedStudent.id)
            ? [{ studentId: storedStudent.id }]
            : []));
        mocks.phqResultCreateMany.mockImplementation(async ({ data }: { data: unknown[] }) => ({
            count: data.length,
        }));
        mocks.activityProgressCreateMany.mockResolvedValue({ count: 0 });
        mocks.transaction.mockImplementation(async (callback) =>
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

    it("normalizes the file's class before storing it on a new student's result", async () => {
        mocks.studentFindMany.mockResolvedValue([]);
        mocks.studentCreateMany.mockResolvedValue([
            { id: "student-new-1", studentId: "N-001" },
            { id: "student-new-2", studentId: "N-002" },
        ]);

        const result = await importStudents(
            [row({ studentId: "N-001", class: "ม1/1" }), row({ studentId: "N-002", class: " ม. 1/2 " })],
            "ay-1",
            1,
        );

        expect(result).toMatchObject({ success: true, phqCreated: 2 });
        expect(createdClassNames()).toEqual(["ม.1/1", "ม.1/2"]);
    });

    it("stores the file's class, not the student's stored class", async () => {
        mocks.studentFindMany.mockResolvedValue([storedStudent]);

        const result = await importStudents([row({ class: "ม.1/1" })], "ay-1", 2);

        expect(result).toMatchObject({ success: true, phqCreated: 1 });
        expect(mocks.phqResultCreateMany).toHaveBeenCalledWith({
            data: [expect.objectContaining({ studentId: storedStudent.id, className: "ม.1/1" })],
        });
    });
});
