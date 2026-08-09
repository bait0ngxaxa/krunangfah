import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ParsedStudent } from "@/lib/utils/excel-parser";
import { prisma } from "@/lib/database/prisma";
import {
    createMockUsers,
    setupAuthMocks,
    type MockUser,
} from "./helpers/auth-mock";
import {
    createTestAcademicYear,
    createTestSchool,
    createTestStudent,
    createTestUser,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";

vi.mock("@/lib/cache/redis-idempotency", () => ({
    startIdempotentOperation: vi.fn(async () => ({ status: "unavailable" })),
    completeIdempotentOperation: vi.fn(),
    clearIdempotentOperation: vi.fn(),
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

setupAuthMocks();

const USERS_A = createMockUsers("import-concurrency-a");
const USERS_B = createMockUsers("import-concurrency-b");
const NATIONAL_ID_BASE = Date.now() * 10;
const { requireAuth } = await import("@/lib/auth/session");
const { importStudents } = await import("@/lib/actions/student/mutations");

describe("Integration: concurrent student imports", () => {
    let schoolId = "";
    let firstAcademicYearId = "";
    let secondAcademicYearId = "";
    let existingStudentId = "";
    let suffix = "";

    beforeAll(async () => {
        suffix = String(Date.now()).slice(-8);
        const yearSuffix = Number(suffix.slice(-5));
        const school = await createTestSchool({
            name: `Import Concurrency ${suffix}`,
        });
        schoolId = school.id;
        USERS_A.schoolAdmin.schoolId = school.id;
        USERS_B.schoolAdmin.schoolId = school.id;

        await Promise.all([
            createTestUser(USERS_A.schoolAdmin, school.id),
            createTestUser(USERS_B.schoolAdmin, school.id),
        ]);
        await prisma.schoolClass.create({
            data: {
                schoolId: school.id,
                name: "ม.1/1",
                expectedStudentCount: 30,
            },
        });
        const [firstAcademicYear, secondAcademicYear] = await Promise.all([
            createTestAcademicYear({ year: 8800 + yearSuffix, semester: 1 }),
            createTestAcademicYear({ year: 8801 + yearSuffix, semester: 1 }),
        ]);
        firstAcademicYearId = firstAcademicYear.id;
        secondAcademicYearId = secondAcademicYear.id;

        const existingStudent = await createTestStudent(school.id, {
            studentId: `CONCURRENT-EXISTING-${suffix}`,
            class: "ม.1/1",
            firstName: "นักเรียน",
        });
        existingStudentId = existingStudent.id;
        await prisma.student.update({
            where: { id: existingStudent.id },
            data: {
                nationalId: createNationalId(1),
                lastName: "พร้อมกัน",
                gender: "MALE",
                age: 13,
            },
        });
    });

    afterAll(async () => {
        if (schoolId) {
            await prisma.student.deleteMany({ where: { schoolId } });
            await prisma.schoolClass.deleteMany({ where: { schoolId } });
        }
        await cleanupAll();
    });

    it("converges two same-context imports to one PHQ and a duplicate result", async () => {
        const row = createImportRow({
            studentId: `CONCURRENT-EXISTING-${suffix}`,
            nationalId: createNationalId(1),
        });

        const results = await runConcurrentImports(
            [USERS_A.schoolAdmin, USERS_B.schoolAdmin],
            [
                () => importStudents([row], firstAcademicYearId, 1),
                () => importStudents([row], firstAcademicYearId, 1),
            ],
        );

        await expect(
            prisma.student.count({ where: { id: existingStudentId } }),
        ).resolves.toBe(1);
        await expect(
            prisma.phqResult.count({
                where: {
                    studentId: existingStudentId,
                    academicYearId: firstAcademicYearId,
                    assessmentRound: 1,
                },
            }),
        ).resolves.toBe(1);
        expect(results.reduce((sum, result) => sum + (result.imported ?? 0), 0)).toBe(
            1,
        );
        expect(results.filter((result) => result.success)).toHaveLength(1);
        expect(
            results.filter((result) => result.duplicateRoundsSkipped === 1),
        ).toHaveLength(1);
        expect(
            results.every(
                (result) => result.message !== "เกิดข้อผิดพลาดในการนำเข้าข้อมูล",
            ),
        ).toBe(true);
    });

    it("counts one Student row across overlapping new-student imports", async () => {
        const studentId = `CONCURRENT-NEW-${suffix}`;
        const nationalId = createNationalId(2);
        const row = createImportRow({ studentId, nationalId });

        const results = await runConcurrentImports(
            [USERS_A.schoolAdmin, USERS_B.schoolAdmin],
            [
                () => importStudents([row], firstAcademicYearId, 1),
                () => importStudents([row], secondAcademicYearId, 1),
            ],
        );

        const students = await prisma.student.findMany({
            where: { schoolId, studentId },
            select: { id: true },
        });
        expect(students).toHaveLength(1);
        const student = students[0];
        if (!student) throw new Error("Concurrent import did not create student");
        await expect(
            prisma.phqResult.count({ where: { studentId: student.id } }),
        ).resolves.toBe(2);
        expect(results.every((result) => result.success)).toBe(true);
        expect(
            results.reduce(
                (sum, result) => sum + (result.createdStudents ?? 0),
                0,
            ),
        ).toBe(1);
    });

    it("uses the last successfully serialized import as one complete master-data winner", async () => {
        const yearSuffix = Number(suffix.slice(-5));
        const [thirdAcademicYear, fourthAcademicYear] = await Promise.all([
            createTestAcademicYear({ year: 8802 + yearSuffix, semester: 1 }),
            createTestAcademicYear({ year: 8803 + yearSuffix, semester: 1 }),
        ]);
        const studentId = `CONCURRENT-MASTER-${suffix}`;
        const nationalId = createNationalId(3);
        const student = await createTestStudent(schoolId, {
            studentId,
            class: "ม.1/1",
            firstName: "ข้อมูลเดิม",
        });
        await prisma.student.update({
            where: { id: student.id },
            data: {
                nationalId,
                lastName: "ก่อนนำเข้า",
                gender: "MALE",
                age: 12,
            },
        });

        const masterDataA = {
            firstName: "ข้อมูลชุดเอ",
            lastName: "พร้อมกันเอ",
            gender: "MALE",
            age: 13,
            class: "ม.1/1",
        } as const;
        const masterDataB = {
            firstName: "ข้อมูลชุดบี",
            lastName: "พร้อมกันบี",
            gender: "FEMALE",
            age: 14,
            class: "ม.1/1",
        } as const;

        const results = await runConcurrentImports(
            [USERS_A.schoolAdmin, USERS_B.schoolAdmin],
            [
                () =>
                    importStudents(
                        [
                            {
                                ...createImportRow({ studentId, nationalId }),
                                ...masterDataA,
                            },
                        ],
                        thirdAcademicYear.id,
                        1,
                    ),
                () =>
                    importStudents(
                        [
                            {
                                ...createImportRow({ studentId, nationalId }),
                                ...masterDataB,
                            },
                        ],
                        fourthAcademicYear.id,
                        1,
                    ),
            ],
        );

        expect(results.every((result) => result.success)).toBe(true);
        await expect(
            prisma.phqResult.count({ where: { studentId: student.id } }),
        ).resolves.toBe(2);
        const committedMasterData = await prisma.student.findUniqueOrThrow({
            where: { id: student.id },
            select: {
                firstName: true,
                lastName: true,
                gender: true,
                age: true,
                class: true,
            },
        });
        expect([masterDataA, masterDataB]).toContainEqual(committedMasterData);
    });
});

async function runConcurrentImports<T>(
    users: [MockUser, MockUser],
    operations: [() => Promise<T>, () => Promise<T>],
): Promise<[T, T]> {
    const expires = new Date(Date.now() + 86_400_000).toISOString();
    vi.mocked(requireAuth)
        .mockResolvedValueOnce({ user: toSessionUser(users[0]), expires })
        .mockResolvedValueOnce({ user: toSessionUser(users[1]), expires });
    return Promise.all([operations[0](), operations[1]()]);
}

function toSessionUser(user: MockUser) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: null,
        role: user.role,
        isPrimary: user.isPrimary ?? false,
        schoolId: user.schoolId ?? null,
    };
}

function createImportRow(input: {
    studentId: string;
    nationalId: string;
}): ParsedStudent {
    return {
        studentId: input.studentId,
        nationalId: input.nationalId,
        firstName: "นักเรียน",
        lastName: "พร้อมกัน",
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
}

function createNationalId(offset: number): string {
    const numeric = String(NATIONAL_ID_BASE + offset)
        .padStart(13, "0")
        .slice(-13);
    return `G${numeric}`;
}
