/**
 * Integration Test: an older term/round import never overwrites newer
 * student master data, and imports are limited to the current academic year.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ParsedStudent } from "@/lib/utils/excel-parser";
import { prisma } from "@/lib/database/prisma";
import { createMockUsers, mockSession, setupAuthMocks } from "./helpers/auth-mock";
import {
    createTestAcademicYear,
    createTestSchool,
    createTestUser,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";

const state = vi.hoisted(() => ({ currentYear: 0 }));
const idempotencyMocks = vi.hoisted(() => ({
    startIdempotentOperation: vi.fn(async () => ({ status: "unavailable" as const })),
}));

vi.mock("@/lib/cache/redis-idempotency", () => ({
    startIdempotentOperation: idempotencyMocks.startIdempotentOperation,
    completeIdempotentOperation: vi.fn(),
    clearIdempotentOperation: vi.fn(),
}));
vi.mock("@/lib/actions/analytics/cache", () => ({ revalidateAnalyticsCache: vi.fn() }));
// Synthetic years keep the suite isolated; pin "current" to the suite's year.
vi.mock("@/lib/services/import-term-policy", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/services/import-term-policy")>();
    return {
        ...actual,
        checkImportTerm: (academicYearId: string) =>
            actual.checkImportTerm(academicYearId, state.currentYear),
    };
});

setupAuthMocks();

const USERS = createMockUsers("import-master-guard");
const NATIONAL_ID_BASE = Date.now() * 10;
const NON_CURRENT_MESSAGE = "ปีการศึกษาที่เลือกไม่ใช่ปีการศึกษาปัจจุบัน กรุณารีเฟรชหน้าแล้วเลือกใหม่";
const { importStudents } = await import("@/lib/actions/student/mutations");

interface RowOptions {
    firstName?: string;
    age?: number;
    className?: string;
    nationalId?: string | null;
}

function row(studentId: string, options: RowOptions = {}): ParsedStudent {
    return {
        studentId,
        nationalId: options.nationalId ?? null,
        firstName: options.firstName ?? "สมชา",
        lastName: "ทดสอบ",
        gender: "MALE",
        age: options.age ?? 13,
        class: options.className ?? "ม.1/1",
        scores: { q1: 1, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q9a: false, q9b: false },
    };
}

function nationalId(offset: number): string {
    return `G${String(NATIONAL_ID_BASE + offset).padStart(13, "0").slice(-13)}`;
}

describe("Integration: import master-data guard", () => {
    let schoolId = "";
    let semesterOneId = "";
    let semesterTwoId = "";
    let previousYearId = "";

    async function findStudent(studentId: string): Promise<{
        id: string;
        firstName: string;
        age: number | null;
        class: string;
        nationalId: string | null;
    }> {
        return prisma.student.findUniqueOrThrow({
            where: { studentId_schoolId: { studentId, schoolId } },
            select: { id: true, firstName: true, age: true, class: true, nationalId: true },
        });
    }

    beforeAll(async () => {
        const suffix = String(Date.now()).slice(-4);
        const currentYear = 6000 + Number(suffix);
        state.currentYear = currentYear;
        schoolId = (await createTestSchool({ name: `Master Guard ${suffix}` })).id;
        USERS.schoolAdmin.schoolId = schoolId;
        await createTestUser(USERS.schoolAdmin, schoolId);
        await prisma.schoolClass.createMany({
            data: [
                { schoolId, name: "ม.1/1", expectedStudentCount: 40 },
                { schoolId, name: "ม.1/2", expectedStudentCount: 40 },
            ],
        });
        semesterOneId = (await createTestAcademicYear({ year: currentYear, semester: 1 })).id;
        semesterTwoId = (await createTestAcademicYear({ year: currentYear, semester: 2 })).id;
        previousYearId = (await createTestAcademicYear({ year: currentYear - 1, semester: 2 })).id;
    });

    afterAll(async () => {
        await prisma.student.deleteMany({ where: { schoolId } });
        await prisma.schoolClass.deleteMany({ where: { schoolId } });
        await cleanupAll();
    });

    it("keeps newer master data when a late semester-1 round-2 file arrives", async () => {
        mockSession(USERS.schoolAdmin);
        const code = "MDG-001";

        await expect(importStudents([row(code)], semesterOneId, 1))
            .resolves.toMatchObject({ success: true, createdStudents: 1 });

        const newer = await importStudents(
            [row(code, { firstName: "สมชาย", age: 14, className: "ม.1/2" })],
            semesterTwoId,
            1,
        );
        expect(newer).toMatchObject({ success: true, updatedStudents: 1, phqCreated: 1 });
        expect(newer).not.toHaveProperty("masterDataPreserved");
        await expect(findStudent(code)).resolves.toMatchObject({
            firstName: "สมชาย",
            age: 14,
            class: "ม.1/2",
        });

        const late = await importStudents([row(code)], semesterOneId, 2);

        expect(late).toMatchObject({
            success: true,
            phqCreated: 1,
            updatedStudents: 0,
            masterDataPreserved: 1,
        });
        const student = await findStudent(code);
        expect(student).toMatchObject({ firstName: "สมชาย", age: 14, class: "ม.1/2" });
        await expect(
            prisma.phqResult.count({
                where: { studentId: student.id, academicYearId: semesterOneId, assessmentRound: 2 },
            }),
        ).resolves.toBe(1);
    });

    it("still fills a missing national ID from an older-context import", async () => {
        mockSession(USERS.schoolAdmin);
        const code = "MDG-002";
        const filledId = nationalId(2);

        await importStudents([row(code)], semesterOneId, 1);
        await importStudents([row(code, { firstName: "สมชาย", age: 14 })], semesterTwoId, 1);

        const late = await importStudents([row(code, { nationalId: filledId })], semesterOneId, 2);

        expect(late).toMatchObject({ success: true, updatedStudents: 1, masterDataPreserved: 1 });
        await expect(findStudent(code)).resolves.toMatchObject({
            firstName: "สมชาย",
            age: 14,
            nationalId: filledId,
        });
    });

    it("updates master data from round 2 of the same term after round 1", async () => {
        mockSession(USERS.schoolAdmin);
        const code = "MDG-003";

        await importStudents([row(code)], semesterOneId, 1);
        const roundTwo = await importStudents([row(code, { className: "ม.1/2" })], semesterOneId, 2);

        expect(roundTwo).toMatchObject({ success: true, updatedStudents: 1 });
        expect(roundTwo).not.toHaveProperty("masterDataPreserved");
        await expect(findStudent(code)).resolves.toMatchObject({ class: "ม.1/2" });
    });

    it("rejects a previous-year term before any write or idempotency claim", async () => {
        mockSession(USERS.schoolAdmin);
        const code = "MDG-004";
        idempotencyMocks.startIdempotentOperation.mockClear();

        for (let attempt = 0; attempt < 2; attempt++) {
            await expect(importStudents([row(code)], previousYearId, 1)).resolves.toEqual({
                success: false,
                status: "error",
                message: NON_CURRENT_MESSAGE,
            });
        }

        expect(idempotencyMocks.startIdempotentOperation).not.toHaveBeenCalled();
        await expect(prisma.student.count({ where: { schoolId, studentId: code } })).resolves.toBe(0);
        await expect(prisma.phqResult.count({ where: { academicYearId: previousYearId } })).resolves.toBe(0);
        await expect(
            prisma.schoolClassTerm.count({ where: { academicYearId: previousYearId } }),
        ).resolves.toBe(0);

        await expect(importStudents([row(code)], semesterOneId, 1))
            .resolves.toMatchObject({ success: true, createdStudents: 1, phqCreated: 1 });
    });
});
