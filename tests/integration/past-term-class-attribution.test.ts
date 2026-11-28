/**
 * Integration Test: past-term reports filter and group a result by the
 * class at assessment time (PhqResult.className), falling back to the
 * student's current class for results imported before the snapshot. The
 * current term and every class-teacher view keep using the current class.
 *
 * Fixture (synthetic years far from real terms; PAST plays 2568/2 and
 * CURRENT plays 2569/1):
 * - A: PAST result snapshotted ม.1/1, then promoted by a CURRENT import to
 *   ม.2/1 (with a CURRENT result).
 * - B: legacy PAST result (className NULL); current class ม.2/2.
 * - PAST SchoolClassTerm rows for ม.1/1 and for ม.1/9, archived since.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AcademicYear } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { ParsedStudent } from "@/lib/utils/excel-parser";
import { prisma } from "@/lib/database/prisma";
import { createMockUsers, mockSession } from "./helpers/auth-mock";
import {
    createTestAcademicYear,
    createTestSchool,
    createTestTeacher,
    createTestUser,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";

const { PAST_YEAR, CURRENT_YEAR } = vi.hoisted(() => ({ PAST_YEAR: 2771, CURRENT_YEAR: 2772 }));
const termState = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/lib/services/academic-year-lifecycle", () => ({
    // The real lifecycle would move isCurrent back to the clock term.
    ensureCurrentAcademicYearLifecycle: vi.fn(async () => termState.current),
}));
vi.mock("@/lib/services/import-term-policy", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/services/import-term-policy")>();
    return {
        ...actual,
        checkImportTerm: (academicYearId: string) =>
            actual.checkImportTerm(academicYearId, CURRENT_YEAR),
    };
});
vi.mock("@/lib/actions/analytics/cache", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/actions/analytics/cache")>()),
    revalidateAnalyticsCache: vi.fn(async () => {}),
}));
vi.mock("@/lib/actions/analytics/redis-cache", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/actions/analytics/redis-cache")>();
    const miss = async () => ({ data: null, versionedKeyParts: null });
    return {
        ...actual,
        readRedisCachedAnalyticsData: miss,
        setRedisCachedAnalyticsData: async () => {},
    };
});
vi.mock("@/lib/cache/redis-idempotency", () => ({
    startIdempotentOperation: vi.fn(async () => ({ status: "unavailable" as const })),
    completeIdempotentOperation: vi.fn(),
    clearIdempotentOperation: vi.fn(),
}));

const USERS = createMockUsers("pastattr");
const { fetchAnalyticsData } = await import("@/lib/actions/analytics/data");
const { getAnalyticsSummary } = await import("@/lib/actions/analytics/main");
const { importStudents } = await import("@/lib/actions/student/mutations");
const { buildAttributedClassSql, buildAttributedClassWhere } = await import(
    "@/lib/utils/class-attribution"
);

const SCORES_YELLOW = { q1: 2, q2: 2, q3: 2, q4: 1, q5: 1, q6: 1, q7: 1, q8: 0, q9: 0 } as const;

let schoolId = "";
let pastTerm: AcademicYear;
let currentTerm: AcademicYear;
let studentA = "";
let studentB = "";

function importRow(studentId: string, className: string): ParsedStudent {
    return {
        studentId,
        nationalId: null,
        firstName: "เอ",
        lastName: "สังเคราะห์",
        gender: "MALE",
        age: 14,
        class: className,
        scores: { ...SCORES_YELLOW, q9a: false, q9b: false },
    };
}

async function createPastResult(studentDbId: string, className: string | null): Promise<void> {
    await prisma.phqResult.create({
        data: {
            studentId: studentDbId,
            academicYearId: pastTerm.id,
            assessmentRound: 1,
            className,
            ...SCORES_YELLOW,
            totalScore: 10,
            riskLevel: "yellow",
        },
    });
}

function adminAnalytics(term: AcademicYear, className = "") {
    return fetchAnalyticsData(
        schoolId,
        className,
        "school_admin",
        String(term.year),
        String(term.semester),
        "",
    );
}

function gradeTotals(data: { gradeRiskData: Array<{ grade: string; total: number }> }) {
    return Object.fromEntries(data.gradeRiskData.map((row) => [row.grade, row.total]));
}

describe("Integration: past terms use the class at assessment time", () => {
    beforeAll(async () => {
        schoolId = (await createTestSchool({ name: "โรงเรียนสังเคราะห์ห้องย้อนหลัง" })).id;
        USERS.schoolAdmin.schoolId = schoolId;
        USERS.classTeacher.schoolId = schoolId;
        await createTestUser(USERS.schoolAdmin, schoolId);
        await createTestUser(USERS.classTeacher, schoolId);
        await createTestTeacher(USERS.classTeacher.id, { advisoryClass: "ม.2/1" });

        pastTerm = await createTestAcademicYear({ year: PAST_YEAR, semester: 2 });
        currentTerm = await createTestAcademicYear({ year: CURRENT_YEAR, semester: 1 });
        currentTerm = await prisma.academicYear.update({
            where: { id: currentTerm.id },
            data: { isCurrent: true },
        });
        termState.current = currentTerm;

        for (const name of ["ม.1/1", "ม.2/1", "ม.2/2"]) {
            await prisma.schoolClass.create({ data: { schoolId, name, expectedStudentCount: 30 } });
        }
        const pastRows = [
            { name: "ม.1/1", expected: 30 },
            { name: "ม.1/9", expected: 25 },
        ];
        for (const { name, expected } of pastRows) {
            const schoolClass = await prisma.schoolClass.upsert({
                where: { schoolId_name: { schoolId, name } },
                update: {},
                create: { schoolId, name, expectedStudentCount: expected },
            });
            await prisma.schoolClassTerm.create({
                data: {
                    schoolClassId: schoolClass.id,
                    academicYearId: pastTerm.id,
                    expectedStudentCount: expected,
                },
            });
        }
        await prisma.schoolClass.update({
            where: { schoolId_name: { schoolId, name: "ม.1/9" } },
            data: { archivedAt: new Date() },
        });

        studentA = (await prisma.student.create({
            data: { schoolId, studentId: "PA-001", firstName: "เอ", lastName: "สังเคราะห์", class: "ม.1/1", gender: "MALE", age: 13 },
        })).id;
        await createPastResult(studentA, "ม.1/1");
        studentB = (await prisma.student.create({
            data: { schoolId, studentId: "PA-002", firstName: "บี", lastName: "สังเคราะห์", class: "ม.2/2", gender: "FEMALE", age: 14 },
        })).id;
        await createPastResult(studentB, null);

        mockSession(USERS.schoolAdmin);
        const promoted = await importStudents([importRow("PA-001", "ม.2/1")], currentTerm.id, 1);
        expect(promoted).toMatchObject({ success: true, updatedStudents: 1, phqCreated: 1 });
    });

    afterAll(async () => {
        await prisma.academicYear
            .updateMany({ where: { year: { in: [PAST_YEAR, CURRENT_YEAR] } }, data: { isCurrent: false } })
            .catch(() => {});
        await prisma.student.deleteMany({ where: { schoolId } });
        await prisma.schoolClass.deleteMany({ where: { schoolId } });
        await cleanupAll();
    });

    it("promoted A to ม.2/1 while its past result keeps ม.1/1", async () => {
        await expect(
            prisma.student.findUniqueOrThrow({ where: { id: studentA }, select: { class: true } }),
        ).resolves.toEqual({ class: "ม.2/1" });
    });

    it("counts A under ม.1/1 (not ม.2/1) in the past term, against the past denominator", async () => {
        const ma11 = await adminAnalytics(pastTerm, "ม.1/1");
        const ma21 = await adminAnalytics(pastTerm, "ม.2/1");

        expect(ma11).toMatchObject({ studentsWithAssessment: 1, totalStudents: 30, studentsWithoutAssessment: 29 });
        expect(ma11.legacyClassAttribution).toBe(false);
        expect(ma21.studentsWithAssessment).toBe(0);
    });

    it("groups the past term by grade at assessment and attributes legacy B to ม.2/2", async () => {
        const all = await adminAnalytics(pastTerm);
        const ma22 = await adminAnalytics(pastTerm, "ม.2/2");

        expect(gradeTotals(all)).toEqual({ "ม.1": 1, "ม.2": 1 });
        expect(all.legacyClassAttribution).toBe(true);
        expect(ma22).toMatchObject({ studentsWithAssessment: 1, legacyClassAttribution: true });
    });

    it("uses current classes and shows no legacy note in the current term", async () => {
        const all = await adminAnalytics(currentTerm);
        const ma21 = await adminAnalytics(currentTerm, "ม.2/1");

        expect(gradeTotals(all)).toEqual({ "ม.2": 1 });
        expect(all.legacyClassAttribution).toBe(false);
        expect(ma21.studentsWithAssessment).toBe(1);
    });

    it("lists the past term's classes, archived ones included; the current term lists active classes", async () => {
        const past = await adminAnalytics(pastTerm);
        const current = await adminAnalytics(currentTerm);

        expect(past.availableClasses).toEqual(expect.arrayContaining(["ม.1/1", "ม.1/9", "ม.2/2"]));
        expect(current.availableClasses).toEqual(expect.arrayContaining(["ม.1/1", "ม.2/1", "ม.2/2"]));
        expect(current.availableClasses).not.toContain("ม.1/9");
    });

    it("offers the past term for class ม.1/1 because a result is attributed to it", async () => {
        const data = await adminAnalytics(pastTerm, "ม.1/1");

        expect(data.availableAcademicTerms.map((term) => term.id)).toContain(pastTerm.id);
        expect(data.availableRounds).toEqual([1]);
    });

    it("keeps the class teacher of ม.2/1 on current-class scope through the action", async () => {
        mockSession(USERS.classTeacher);
        try {
            const result = await getAnalyticsSummary(undefined, undefined, PAST_YEAR, 2);

            expect(result.status).toBe("success");
            if (result.status !== "success") throw new Error("Expected analytics");
            // Same as before attribution: A is in ม.2/1 now, so its past result counts, under ม.2.
            expect(result.data).toMatchObject({
                studentsWithAssessment: 1,
                currentClass: "ม.2/1",
                legacyClassAttribution: false,
                availableClasses: [],
            });
            expect(gradeTotals(result.data)).toEqual({ "ม.2": 1 });
            expect(result.data.availableAcademicTerms.map((term) => term.id))
                .toEqual(expect.arrayContaining([pastTerm.id, currentTerm.id]));
        } finally {
            mockSession(USERS.schoolAdmin);
        }
    });

    it("the Prisma attribution where selects the same results as the SQL fragment", async () => {
        for (const className of ["ม.1/1", "ม.2/1", "ม.2/2"]) {
            const viaPrisma = await prisma.phqResult.findMany({
                where: { studentId: { in: [studentA, studentB] }, ...buildAttributedClassWhere(className) },
                select: { id: true },
                orderBy: { id: "asc" },
            });
            const viaSql = await prisma.$queryRaw<Array<{ id: string }>>`
                SELECT pr.id
                FROM phq_results pr
                JOIN students s ON pr."studentId" = s.id
                JOIN academic_years ay ON pr."academicYearId" = ay.id
                WHERE pr."studentId" IN (${Prisma.join([studentA, studentB])})
                  AND ${buildAttributedClassSql()} = ${className}
                ORDER BY pr.id ASC
            `;
            expect(viaPrisma).toEqual(viaSql);
        }
    });
});
