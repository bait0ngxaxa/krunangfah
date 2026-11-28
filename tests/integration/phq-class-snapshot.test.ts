/**
 * Integration Test: each imported PHQ result keeps the class from the file
 * (normalized), even when the master-data guard keeps a newer students.class.
 * Results imported before the snapshot column existed stay NULL, and later
 * student edits never rewrite a stored snapshot.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ParsedStudent } from "@/lib/utils/excel-parser";
import { prisma } from "@/lib/database/prisma";
import { createMockUsers, mockSession } from "./helpers/auth-mock";
import {
    createTestAcademicYear,
    createTestSchool,
    createTestUser,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";

// Synthetic far-future year keeps the suite away from real and other suites' terms.
const SNAPSHOT_YEAR = 2761;
const MIGRATION_PATH = join(
    process.cwd(),
    "prisma",
    "migrations",
    "20261128010000_add_phq_result_class_name",
    "migration.sql",
);

vi.mock("@/lib/cache/redis-idempotency", () => ({
    startIdempotentOperation: vi.fn(async () => ({ status: "unavailable" as const })),
    completeIdempotentOperation: vi.fn(),
    clearIdempotentOperation: vi.fn(),
}));
vi.mock("@/lib/actions/analytics/cache", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/actions/analytics/cache")>()),
    revalidateAnalyticsCache: vi.fn(async () => {}),
}));
vi.mock("@/lib/services/import-term-policy", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/services/import-term-policy")>();
    return {
        ...actual,
        checkImportTerm: (academicYearId: string) =>
            actual.checkImportTerm(academicYearId, SNAPSHOT_YEAR),
    };
});

const USERS = createMockUsers("phq-class-snapshot");
const { importStudents } = await import("@/lib/actions/student/mutations");
const { updateSystemStudent } = await import("@/lib/actions/system-admin/mutations");

function row(studentId: string, className: string): ParsedStudent {
    return {
        studentId,
        nationalId: null,
        firstName: "สมหญิง",
        lastName: "สังเคราะห์",
        gender: "FEMALE",
        age: 13,
        class: className,
        scores: { q1: 1, q2: 1, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q9a: false, q9b: false },
    };
}

describe("Integration: PHQ result class snapshot", () => {
    let schoolId = "";
    let semesterOneId = "";
    let semesterTwoId = "";

    async function findStudent(studentId: string): Promise<{
        id: string;
        class: string;
        updatedAt: Date;
        firstName: string;
        lastName: string;
    }> {
        return prisma.student.findUniqueOrThrow({
            where: { studentId_schoolId: { studentId, schoolId } },
            select: { id: true, class: true, updatedAt: true, firstName: true, lastName: true },
        });
    }

    async function snapshots(studentDbId: string): Promise<
        Array<{ academicYearId: string; assessmentRound: number; className: string | null }>
    > {
        return prisma.phqResult.findMany({
            where: { studentId: studentDbId },
            orderBy: [{ createdAt: "asc" }],
            select: { academicYearId: true, assessmentRound: true, className: true },
        });
    }

    beforeAll(async () => {
        schoolId = (await createTestSchool({ name: "โรงเรียนสังเคราะห์ห้องตอนประเมิน" })).id;
        USERS.schoolAdmin.schoolId = schoolId;
        await createTestUser(USERS.schoolAdmin, schoolId);
        await prisma.schoolClass.createMany({
            data: [
                { schoolId, name: "ม.1/1", expectedStudentCount: 40 },
                { schoolId, name: "ม.1/2", expectedStudentCount: 40 },
            ],
        });
        semesterOneId = (await createTestAcademicYear({ year: SNAPSHOT_YEAR, semester: 1 })).id;
        semesterTwoId = (await createTestAcademicYear({ year: SNAPSHOT_YEAR, semester: 2 })).id;
    });

    afterAll(async () => {
        await prisma.academicYear
            .updateMany({ where: { year: SNAPSHOT_YEAR }, data: { isCurrent: false } })
            .catch(() => {});
        const students = await prisma.student.findMany({ where: { schoolId }, select: { id: true } });
        await prisma.systemAdminEvent
            .deleteMany({ where: { targetId: { in: students.map((student) => student.id) } } })
            .catch(() => {});
        await prisma.student.deleteMany({ where: { schoolId } });
        await prisma.schoolClass.deleteMany({ where: { schoolId } });
        await cleanupAll();
    });

    it("stores the file's class on every row of a round-1 import", async () => {
        mockSession(USERS.schoolAdmin);

        const result = await importStudents(
            [row("SNAP-001", "ม.1/1"), row("SNAP-002", "ม.1/1")],
            semesterOneId,
            1,
        );

        expect(result).toMatchObject({ success: true, createdStudents: 2, phqCreated: 2 });
        for (const code of ["SNAP-001", "SNAP-002"]) {
            const student = await findStudent(code);
            await expect(snapshots(student.id)).resolves.toEqual([
                { academicYearId: semesterOneId, assessmentRound: 1, className: "ม.1/1" },
            ]);
        }
    });

    it("stores the normalized class name from the file", async () => {
        mockSession(USERS.schoolAdmin);

        const result = await importStudents([row("SNAP-003", "ม1/1")], semesterOneId, 1);

        expect(result).toMatchObject({ success: true, phqCreated: 1 });
        const student = await findStudent("SNAP-003");
        expect(student.class).toBe("ม.1/1");
        await expect(snapshots(student.id)).resolves.toEqual([
            { academicYearId: semesterOneId, assessmentRound: 1, className: "ม.1/1" },
        ]);
    });

    it("keeps the file's class on a late older-context row while students.class stays newer", async () => {
        mockSession(USERS.schoolAdmin);
        const code = "SNAP-004";

        await importStudents([row(code, "ม.1/1")], semesterOneId, 1);
        await expect(importStudents([row(code, "ม.1/2")], semesterTwoId, 1))
            .resolves.toMatchObject({ success: true, updatedStudents: 1 });

        const late = await importStudents([row(code, "ม.1/1")], semesterOneId, 2);

        expect(late).toMatchObject({ success: true, phqCreated: 1, masterDataPreserved: 1 });
        const student = await findStudent(code);
        expect(student.class).toBe("ม.1/2");
        await expect(snapshots(student.id)).resolves.toEqual([
            { academicYearId: semesterOneId, assessmentRound: 1, className: "ม.1/1" },
            { academicYearId: semesterTwoId, assessmentRound: 1, className: "ม.1/2" },
            { academicYearId: semesterOneId, assessmentRound: 2, className: "ม.1/1" },
        ]);
    });

    it("leaves every stored snapshot unchanged when a system admin moves the student", async () => {
        // The edit adjusts current-term class counts; make this suite's term current.
        await prisma.academicYear.update({
            where: { id: semesterTwoId },
            data: { isCurrent: true },
        });
        const student = await findStudent("SNAP-004");
        const before = await snapshots(student.id);

        const result = await updateSystemStudent(
            {
                id: student.id,
                expectedUpdatedAt: student.updatedAt,
                studentId: "SNAP-004",
                nationalId: undefined,
                firstName: student.firstName,
                lastName: student.lastName,
                gender: "",
                age: "",
                class: "ม.1/1",
                status: "ACTIVE",
                reason: "ย้ายห้องสังเคราะห์",
            },
            {
                id: USERS.systemAdmin.id,
                email: USERS.systemAdmin.email,
                name: USERS.systemAdmin.name,
                role: "system_admin",
            },
        );

        expect(result.success).toBe(true);
        await expect(findStudent("SNAP-004")).resolves.toMatchObject({ class: "ม.1/1" });
        await expect(snapshots(student.id)).resolves.toEqual(before);
        expect(before.map((snapshot) => snapshot.className)).toEqual(["ม.1/1", "ม.1/2", "ม.1/1"]);
    });

    it("migration adds a nullable column with no default and no backfill", async () => {
        // The CI role cannot run DDL, so the migration is checked by content
        // and by the migrated catalog rather than replayed.
        const statements = (await readFile(MIGRATION_PATH, "utf8"))
            .split(/\r?\n/)
            .filter((line) => !line.trim().startsWith("--"))
            .join(" ")
            .split(";")
            .map((statement) => statement.replace(/\s+/g, " ").trim())
            .filter((statement) => statement.length > 0);
        expect(statements).toEqual(['ALTER TABLE "phq_results" ADD COLUMN "className" TEXT']);

        await expect(
            prisma.$queryRaw<Array<{ is_nullable: string; column_default: string | null }>>`
                SELECT is_nullable, column_default FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'phq_results' AND column_name = 'className'`,
        ).resolves.toEqual([{ is_nullable: "YES", column_default: null }]);
    });

    it("stores NULL for a result written without a class, as before the snapshot", async () => {
        const student = await findStudent("SNAP-002");
        const legacyId = `phq-legacy-${student.id}`;

        // The pre-snapshot INSERT shape: it never names "className".
        await prisma.$executeRaw`
            INSERT INTO "phq_results" (
                "id", "studentId", "academicYearId", "assessmentRound",
                "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9",
                "totalScore", "riskLevel", "updatedAt"
            ) VALUES (
                ${legacyId}, ${student.id}, ${semesterTwoId}, 1,
                0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 'blue'::"RiskLevel", NOW()
            )`;

        await expect(
            prisma.phqResult.findUniqueOrThrow({
                where: { id: legacyId },
                select: { className: true },
            }),
        ).resolves.toEqual({ className: null });
    });
});
