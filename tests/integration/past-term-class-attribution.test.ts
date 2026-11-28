/**
 * Integration Test: past-term reports filter and group a result by the
 * class at assessment time (PhqResult.className), falling back to the
 * student's current class for results imported before the snapshot. The
 * current term and every class-teacher view keep using the current class.
 *
 * Fixture (synthetic years far from real terms; PAST plays 2568/2,
 * PAST_ONE 2568/1 and CURRENT 2569/1):
 * - A: PAST result snapshotted ม.1/1, then promoted by a CURRENT import to
 *   ม.2/1 (with a CURRENT result).
 * - B: legacy PAST result (className NULL). B was in ม.1/1 then and is in
 *   ม.2/1 now, so the fallback moves it out of ม.1/1.
 * - C: PAST result snapshotted ม.1/9, a class archived since; now ม.2/2.
 * - SchoolClassTerm rows: PAST has ม.1/1 (30) and ม.1/9 (25); PAST_ONE ม.1/1.
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

vi.mock("next/navigation", () => ({
    redirect: vi.fn((path: string): never => {
        throw new Error(`REDIRECT:${path}`);
    }),
}));
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
const { getNamedSubmissionRecords } = await import("@/lib/exports/named-submission/query");
const { mapNamedSubmissionRecord } = await import("@/lib/exports/named-submission/mapper");
const { default: AnalyticsPage } = await import("@/app/(protected)/analytics/page");

const LEGACY_SOURCE = "ห้องปัจจุบัน (ข้อมูลก่อนมีการบันทึกห้อง)";
const SCORES_YELLOW = { q1: 2, q2: 2, q3: 2, q4: 1, q5: 1, q6: 1, q7: 1, q8: 0, q9: 0 } as const;

let schoolId = "";
let pastTermOne: AcademicYear;
let pastTerm: AcademicYear;
let currentTerm: AcademicYear;
let studentA = "";
let studentB = "";
let studentC = "";

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

async function createStudent(code: string, className: string): Promise<string> {
    const student = await prisma.student.create({
        data: { schoolId, studentId: code, firstName: "นักเรียน", lastName: "สังเคราะห์", class: className, gender: "FEMALE", age: 14 },
    });
    return student.id;
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

async function createClassWithTerms(name: string, terms: Array<{ term: AcademicYear; expected: number }>): Promise<void> {
    const schoolClass = await prisma.schoolClass.upsert({
        where: { schoolId_name: { schoolId, name } },
        update: {},
        create: { schoolId, name, expectedStudentCount: 30 },
    });
    for (const { term, expected } of terms) {
        await prisma.schoolClassTerm.create({
            data: { schoolClassId: schoolClass.id, academicYearId: term.id, expectedStudentCount: expected },
        });
    }
}

function adminAnalytics(term: { year: number; semester?: number }, className = "") {
    return fetchAnalyticsData(
        schoolId,
        className,
        "school_admin",
        String(term.year),
        term.semester === undefined ? "" : String(term.semester),
        "",
    );
}

function gradeTotals(data: { gradeRiskData: Array<{ grade: string; total: number }> }) {
    return Object.fromEntries(data.gradeRiskData.map((row) => [row.grade, row.total]));
}

async function exportRows(term: AcademicYear, className?: string) {
    const records = await getNamedSubmissionRecords({
        schoolId,
        academicYear: term.year,
        semester: term.semester,
        ...(className ? { className } : {}),
    });
    return records
        .map(mapNamedSubmissionRecord)
        .map(({ studentId, className: rowClass, classSource }) => ({
            studentId,
            className: rowClass,
            classSource,
        }))
        .sort((left, right) => left.studentId.localeCompare(right.studentId));
}

/** Renders the analytics page and returns the warnings it passes to the content. */
async function pageWarnings(searchParams: Record<string, string>): Promise<string[]> {
    const page = await AnalyticsPage({ searchParams: Promise.resolve(searchParams) });
    const content = (page as unknown as {
        props: { children: Array<{ props: { children: { props: { filterWarnings: string[] } } } }> };
    }).props.children[1]?.props.children.props.filterWarnings;
    if (!content) throw new Error("Expected analytics content");
    return content;
}

describe("Integration: past terms use the class at assessment time", () => {
    beforeAll(async () => {
        schoolId = (await createTestSchool({ name: "โรงเรียนสังเคราะห์ห้องย้อนหลัง" })).id;
        USERS.schoolAdmin.schoolId = schoolId;
        USERS.classTeacher.schoolId = schoolId;
        await createTestUser(USERS.schoolAdmin, schoolId);
        await createTestUser(USERS.classTeacher, schoolId);
        await createTestTeacher(USERS.classTeacher.id, { advisoryClass: "ม.2/1" });

        pastTermOne = await createTestAcademicYear({ year: PAST_YEAR, semester: 1 });
        pastTerm = await createTestAcademicYear({ year: PAST_YEAR, semester: 2 });
        currentTerm = await createTestAcademicYear({ year: CURRENT_YEAR, semester: 1 });
        currentTerm = await prisma.academicYear.update({
            where: { id: currentTerm.id },
            data: { isCurrent: true },
        });
        termState.current = currentTerm;

        await createClassWithTerms("ม.1/1", [
            { term: pastTermOne, expected: 30 },
            { term: pastTerm, expected: 30 },
        ]);
        await createClassWithTerms("ม.1/9", [{ term: pastTerm, expected: 25 }]);
        await createClassWithTerms("ม.2/1", []);
        await createClassWithTerms("ม.2/2", []);
        await prisma.schoolClass.update({
            where: { schoolId_name: { schoolId, name: "ม.1/9" } },
            data: { archivedAt: new Date() },
        });

        studentA = await createStudent("PA-001", "ม.1/1");
        await createPastResult(studentA, "ม.1/1");
        studentB = await createStudent("PA-002", "ม.2/1");
        await createPastResult(studentB, null);
        studentC = await createStudent("PA-003", "ม.2/2");
        await createPastResult(studentC, "ม.1/9");

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

    it("counts A under ม.1/1 against the past denominator; legacy B drops out and the note shows", async () => {
        const ma11 = await adminAnalytics(pastTerm, "ม.1/1");

        expect(ma11).toMatchObject({
            studentsWithAssessment: 1,
            totalStudents: 30,
            studentsWithoutAssessment: 29,
            // B was in ม.1/1 then, but its legacy row now falls back to ม.2/1.
            legacyClassAttribution: true,
        });
    });

    it("counts legacy B under its current class ม.2/1, not promoted A", async () => {
        const ma21 = await adminAnalytics(pastTerm, "ม.2/1");

        expect(ma21).toMatchObject({ studentsWithAssessment: 1, legacyClassAttribution: true });
    });

    it("counts C under the archived ม.1/9 against its past denominator", async () => {
        const ma19 = await adminAnalytics(pastTerm, "ม.1/9");

        expect(ma19).toMatchObject({ studentsWithAssessment: 1, totalStudents: 25 });
    });

    it("groups the past term by grade at assessment", async () => {
        const all = await adminAnalytics(pastTerm);

        expect(gradeTotals(all)).toEqual({ "ม.1": 2, "ม.2": 1 });
        expect(all.legacyClassAttribution).toBe(true);
    });

    it("uses current classes and shows no legacy note in the current term", async () => {
        const all = await adminAnalytics(currentTerm);
        const ma21 = await adminAnalytics(currentTerm, "ม.2/1");

        expect(gradeTotals(all)).toEqual({ "ม.2": 1 });
        expect(all.legacyClassAttribution).toBe(false);
        expect(ma21).toMatchObject({ studentsWithAssessment: 1, legacyClassAttribution: false });
    });

    it("lists the past term's classes, archived ones included; the current term lists active classes", async () => {
        const past = await adminAnalytics(pastTerm);
        const current = await adminAnalytics(currentTerm);

        expect([...past.availableClasses].sort()).toEqual(["ม.1/1", "ม.1/9", "ม.2/1"]);
        expect([...current.availableClasses].sort()).toEqual(["ม.1/1", "ม.2/1", "ม.2/2"]);
    });

    it("keeps the archived ม.1/9 in a year-wide view of the past year, also after selecting it", async () => {
        const yearWide = await adminAnalytics({ year: PAST_YEAR });
        const yearWideMa19 = await adminAnalytics({ year: PAST_YEAR }, "ม.1/9");

        expect(yearWide.availableClasses).toContain("ม.1/9");
        expect(yearWideMa19.availableClasses).toContain("ม.1/9");
        expect(yearWideMa19.studentsWithAssessment).toBe(1);
        // Year-wide is a multi-term view: no single-term legacy note.
        expect(yearWide.legacyClassAttribution).toBe(false);
    });

    it("shows no missing-class warning after picking ม.1/9 resets the semester", async () => {
        mockSession(USERS.schoolAdmin);
        const picked = await pageWarnings({ year: String(PAST_YEAR), semester: "2", class: "ม.1/9" });
        // ClassFilter's change drops the semester and round from the URL.
        const afterReset = await pageWarnings({ year: String(PAST_YEAR), class: "ม.1/9" });

        for (const warnings of [picked, afterReset]) {
            expect(warnings.some((warning) => warning.startsWith("ไม่พบห้องเรียน"))).toBe(false);
        }
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
            // Same as before attribution: A and B are in ม.2/1 now, so both past results count, under ม.2.
            expect(result.data).toMatchObject({
                studentsWithAssessment: 2,
                currentClass: "ม.2/1",
                legacyClassAttribution: false,
                availableClasses: [],
            });
            expect(gradeTotals(result.data)).toEqual({ "ม.2": 2 });
            expect(result.data.availableAcademicTerms.map((term) => term.id))
                .toEqual(expect.arrayContaining([pastTerm.id, currentTerm.id]));
        } finally {
            mockSession(USERS.schoolAdmin);
        }
    });

    it("the Prisma attribution where selects the same results as the SQL fragment", async () => {
        const students = [studentA, studentB, studentC];
        for (const className of ["ม.1/1", "ม.1/9", "ม.2/1", "ม.2/2"]) {
            const viaPrisma = await prisma.phqResult.findMany({
                where: { studentId: { in: students }, ...buildAttributedClassWhere(className) },
                select: { id: true },
                orderBy: { id: "asc" },
            });
            const viaSql = await prisma.$queryRaw<Array<{ id: string }>>`
                SELECT pr.id
                FROM phq_results pr
                JOIN students s ON pr."studentId" = s.id
                JOIN academic_years ay ON pr."academicYearId" = ay.id
                WHERE pr."studentId" IN (${Prisma.join(students)})
                  AND ${buildAttributedClassSql()} = ${className}
                ORDER BY pr.id ASC
            `;
            expect(viaPrisma).toEqual(viaSql);
        }
    });

    it("exports the past term by the class at assessment and labels the class source", async () => {
        await expect(exportRows(pastTerm, "ม.1/1")).resolves.toEqual([
            { studentId: "PA-001", className: "ม.1/1", classSource: "ตอนประเมิน" },
        ]);
        await expect(exportRows(pastTerm)).resolves.toEqual([
            { studentId: "PA-001", className: "ม.1/1", classSource: "ตอนประเมิน" },
            { studentId: "PA-002", className: "ม.2/1", classSource: LEGACY_SOURCE },
            { studentId: "PA-003", className: "ม.1/9", classSource: "ตอนประเมิน" },
        ]);
    });

    it("exports the current term by the current class", async () => {
        await expect(exportRows(currentTerm)).resolves.toEqual([
            { studentId: "PA-001", className: "ม.2/1", classSource: "ตอนประเมิน" },
        ]);
        await expect(exportRows(currentTerm, "ม.2/1")).resolves.toEqual([
            { studentId: "PA-001", className: "ม.2/1", classSource: "ตอนประเมิน" },
        ]);
    });
});
