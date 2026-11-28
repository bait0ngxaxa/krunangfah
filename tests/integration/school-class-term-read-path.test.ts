/**
 * Integration Test: class-term rows are created only by intentional writes
 *
 * A SchoolClassTerm row means "this class existed in that term" and is the
 * screening-coverage denominator. Read paths must not create rows for past
 * terms; class-management writes stay inside the current academic year.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockSession, createMockUsers } from "./helpers/auth-mock";
import {
    createTestAcademicYear,
    createTestSchool,
    createTestUser,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { prisma } from "@/lib/database/prisma";
import type { AcademicYear } from "@prisma/client";

// Synthetic far-future terms isolate this suite from real and other suites' terms.
const PREVIOUS_YEAR = 2711;
const CURRENT_YEAR = 2712;

const termState = vi.hoisted(() => ({
    current: null as null | {
        id: string;
        year: number;
        semester: number;
        isCurrent: boolean;
        startDate: Date;
        endDate: Date;
    },
}));

vi.mock("@/lib/services/current-year-term-policy", async (importOriginal) => {
    const actual = await importOriginal<
        typeof import("@/lib/services/current-year-term-policy")
    >();
    return {
        ...actual,
        // The clock-based academic year is not the synthetic suite year.
        checkCurrentYearTerm: (academicYearId: string, currentYear?: number) =>
            actual.checkCurrentYearTerm(academicYearId, currentYear ?? CURRENT_YEAR),
    };
});
vi.mock("@/lib/services/academic-year-lifecycle", () => ({
    // Real lifecycle would move isCurrent back to the clock term mid-suite.
    ensureCurrentAcademicYearLifecycle: vi.fn(async () => {
        if (!termState.current) throw new Error("Suite current term not set");
        return termState.current;
    }),
}));
vi.mock("@/lib/actions/analytics/cache", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/actions/analytics/cache")>()),
    revalidateAnalyticsCache: vi.fn(),
}));
vi.mock("@/lib/actions/analytics/redis-cache", async (importOriginal) => {
    const actual = await importOriginal<
        typeof import("@/lib/actions/analytics/redis-cache")
    >();
    const miss = async () => ({ data: null, versionedKeyParts: null });
    return {
        ...actual,
        readRedisCachedAnalyticsData: miss,
        readRedisCachedSystemOverview: miss,
        setRedisCachedAnalyticsData: async () => {},
        setRedisCachedSystemOverview: async () => {},
    };
});

const USERS = createMockUsers("sctrp");

const {
    addSchoolClass,
    getSchoolClasses,
    updateSchoolClassStudentCount,
} = await import("@/lib/actions/school-setup.actions");
const { getSystemAnalyticsOverview } = await import(
    "@/lib/actions/analytics/main"
);
const { getExpectedStudentCount } = await import(
    "@/lib/actions/analytics/data"
);

let previousYearTerm: AcademicYear;
let semesterOne: AcademicYear;
let semesterTwo: AcademicYear;

async function createSchoolAsAdmin(): Promise<string> {
    const school = await createTestSchool({ name: "โรงเรียนสังเคราะห์" });
    mockSession({ ...USERS.schoolAdmin, schoolId: school.id });
    return school.id;
}

async function createClassInTerms(
    schoolId: string,
    name: string,
    terms: Array<{ term: AcademicYear; count: number }>,
    classCount = terms.at(-1)?.count ?? 0,
): Promise<string> {
    const schoolClass = await prisma.schoolClass.create({
        data: { schoolId, name, expectedStudentCount: classCount },
    });
    await prisma.schoolClassTerm.createMany({
        data: terms.map(({ term, count }) => ({
            schoolClassId: schoolClass.id,
            academicYearId: term.id,
            expectedStudentCount: count,
        })),
    });
    return schoolClass.id;
}

async function countSchoolTermRows(schoolId: string): Promise<number> {
    return prisma.schoolClassTerm.count({
        where: { schoolClass: { schoolId } },
    });
}

describe("Integration: class-term read paths and term-scoped writes", () => {
    beforeAll(async () => {
        previousYearTerm = await createTestAcademicYear({
            year: PREVIOUS_YEAR,
            semester: 2,
        });
        semesterOne = await createTestAcademicYear({
            year: CURRENT_YEAR,
            semester: 1,
        });
        semesterTwo = await createTestAcademicYear({
            year: CURRENT_YEAR,
            semester: 2,
        });
        semesterTwo = await prisma.academicYear.update({
            where: { id: semesterTwo.id },
            data: { isCurrent: true },
        });
        termState.current = semesterTwo;
        await createTestUser(USERS.systemAdmin);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    afterAll(async () => {
        await prisma.academicYear
            .update({ where: { id: semesterTwo.id }, data: { isCurrent: false } })
            .catch(() => {});
        await cleanupAll();
    });

    describe("getSchoolClasses", () => {
        it("creates zero rows for a past term and returns null for classes absent from it", async () => {
            const schoolId = await createSchoolAsAdmin();
            await createClassInTerms(schoolId, "ม.1/1", [
                { term: semesterOne, count: 30 },
                { term: semesterTwo, count: 31 },
            ]);
            // Created in semester 2, after semester 1 ended.
            await createClassInTerms(schoolId, "ม.1/5", [
                { term: semesterTwo, count: 28 },
            ]);
            const before = await countSchoolTermRows(schoolId);

            const result = await getSchoolClasses(semesterOne.id);

            expect(await countSchoolTermRows(schoolId)).toBe(before);
            expect(result.status).toBe("success");
            if (result.status !== "success") throw new Error("Expected classes");
            expect(result.data).toEqual([
                expect.objectContaining({ name: "ม.1/1", expectedStudentCount: 30 }),
                expect.objectContaining({ name: "ม.1/5", expectedStudentCount: null }),
            ]);
        });

        it("self-heals a missing current-term row and never returns null for the current term", async () => {
            const schoolId = await createSchoolAsAdmin();
            const classId = await createClassInTerms(schoolId, "ม.2/1", [
                { term: semesterOne, count: 26 },
            ]);

            const result = await getSchoolClasses();

            await expect(
                prisma.schoolClassTerm.findUnique({
                    where: {
                        schoolClassId_academicYearId: {
                            schoolClassId: classId,
                            academicYearId: semesterTwo.id,
                        },
                    },
                    select: { expectedStudentCount: true },
                }),
            ).resolves.toEqual({ expectedStudentCount: 26 });
            expect(result.status).toBe("success");
            if (result.status !== "success") throw new Error("Expected classes");
            expect(result.data.every((c) => c.expectedStudentCount !== null)).toBe(true);
        });
    });

    describe("getSystemAnalyticsOverview", () => {
        it("is read-only for a past term", async () => {
            const schoolId = await createSchoolAsAdmin();
            await createClassInTerms(schoolId, "ม.3/1", [
                { term: semesterOne, count: 20 },
                { term: semesterTwo, count: 20 },
            ]);
            await createClassInTerms(schoolId, "ม.3/5", [
                { term: semesterTwo, count: 15 },
            ]);
            const rowsBefore = await prisma.schoolClassTerm.count();
            const expectedBefore = await getExpectedStudentCount(undefined, undefined, [
                semesterOne.id,
            ]);

            mockSession(USERS.systemAdmin);
            const result = await getSystemAnalyticsOverview(CURRENT_YEAR, 1);

            expect(result.status).toBe("success");
            expect(await prisma.schoolClassTerm.count()).toBe(rowsBefore);
            await expect(
                getExpectedStudentCount(undefined, undefined, [semesterOne.id]),
            ).resolves.toBe(expectedBefore);
        });
    });

    describe("updateSchoolClassStudentCount", () => {
        it("changes only the past-term row when editing a past term", async () => {
            const schoolId = await createSchoolAsAdmin();
            const classId = await createClassInTerms(schoolId, "ม.4/1", [
                { term: semesterOne, count: 30 },
                { term: semesterTwo, count: 32 },
            ], 32);

            const result = await updateSchoolClassStudentCount(classId, 27, semesterOne.id);

            expect(result).toMatchObject({
                success: true,
                data: { id: classId, expectedStudentCount: 27 },
            });
            const terms = await prisma.schoolClassTerm.findMany({
                where: { schoolClassId: classId },
                select: { academicYearId: true, expectedStudentCount: true },
            });
            expect(terms).toEqual(
                expect.arrayContaining([
                    { academicYearId: semesterOne.id, expectedStudentCount: 27 },
                    { academicYearId: semesterTwo.id, expectedStudentCount: 32 },
                ]),
            );
            await expect(
                prisma.schoolClass.findUnique({
                    where: { id: classId },
                    select: { expectedStudentCount: true },
                }),
            ).resolves.toEqual({ expectedStudentCount: 32 });
        });

        it("adds a class to a past term when a count is saved for it", async () => {
            const schoolId = await createSchoolAsAdmin();
            const classId = await createClassInTerms(schoolId, "ม.4/5", [
                { term: semesterTwo, count: 18 },
            ]);

            await updateSchoolClassStudentCount(classId, 17, semesterOne.id);

            await expect(
                prisma.schoolClassTerm.count({
                    where: { schoolClassId: classId, academicYearId: semesterOne.id },
                }),
            ).resolves.toBe(1);
        });

        it("updates both the current-term row and the class count for the current term", async () => {
            const schoolId = await createSchoolAsAdmin();
            const classId = await createClassInTerms(schoolId, "ม.4/2", [
                { term: semesterTwo, count: 32 },
            ], 32);

            await updateSchoolClassStudentCount(classId, 35, semesterTwo.id);

            await expect(
                prisma.schoolClassTerm.findUnique({
                    where: {
                        schoolClassId_academicYearId: {
                            schoolClassId: classId,
                            academicYearId: semesterTwo.id,
                        },
                    },
                    select: { expectedStudentCount: true },
                }),
            ).resolves.toEqual({ expectedStudentCount: 35 });
            await expect(
                prisma.schoolClass.findUnique({
                    where: { id: classId },
                    select: { expectedStudentCount: true },
                }),
            ).resolves.toEqual({ expectedStudentCount: 35 });
        });
    });

    describe("addSchoolClass", () => {
        it("creates rows for the selected earlier term through the current term", async () => {
            const schoolId = await createSchoolAsAdmin();

            const result = await addSchoolClass("ม.5/1", 29, semesterOne.id);

            expect(result.success).toBe(true);
            const schoolClass = await prisma.schoolClass.findUniqueOrThrow({
                where: { schoolId_name: { schoolId, name: "ม.5/1" } },
                select: {
                    terms: { select: { academicYearId: true, expectedStudentCount: true } },
                },
            });
            expect(schoolClass.terms).toHaveLength(2);
            expect(schoolClass.terms).toEqual(
                expect.arrayContaining([
                    { academicYearId: semesterOne.id, expectedStudentCount: 29 },
                    { academicYearId: semesterTwo.id, expectedStudentCount: 29 },
                ]),
            );
        });

        it("creates only the current-term row when no term is given", async () => {
            const schoolId = await createSchoolAsAdmin();

            await addSchoolClass("ม.5/3", 22);

            const terms = await prisma.schoolClassTerm.findMany({
                where: { schoolClass: { schoolId, name: "ม.5/3" } },
                select: { academicYearId: true },
            });
            expect(terms).toEqual([{ academicYearId: semesterTwo.id }]);
        });

        it("leaves no class behind when the second term row fails", async () => {
            const schoolId = await createSchoolAsAdmin();
            const realTransaction = prisma.$transaction.bind(prisma);
            vi.spyOn(prisma, "$transaction").mockImplementationOnce(((
                run: (tx: unknown) => Promise<unknown>,
            ) =>
                realTransaction(async (tx) => {
                    let termCreates = 0;
                    const failingTerms = new Proxy(tx.schoolClassTerm, {
                        get(target, property, receiver) {
                            if (property !== "create") {
                                return Reflect.get(target, property, receiver);
                            }
                            return (args: Parameters<typeof tx.schoolClassTerm.create>[0]) => {
                                termCreates += 1;
                                if (termCreates === 2) {
                                    throw new Error("injected second-row failure");
                                }
                                return target.create(args);
                            };
                        },
                    });
                    const failingTx = new Proxy(tx, {
                        get(target, property, receiver) {
                            return property === "schoolClassTerm"
                                ? failingTerms
                                : Reflect.get(target, property, receiver);
                        },
                    });
                    return run(failingTx);
                })) as unknown as typeof prisma.$transaction);

            const result = await addSchoolClass("ม.5/2", 25, semesterOne.id);

            expect(result.success).toBe(false);
            await expect(
                prisma.schoolClass.count({ where: { schoolId, name: "ม.5/2" } }),
            ).resolves.toBe(0);
            expect(await countSchoolTermRows(schoolId)).toBe(0);
        });
    });

    describe("terms outside the current academic year", () => {
        it("are rejected by both actions with zero writes", async () => {
            const schoolId = await createSchoolAsAdmin();
            const classId = await createClassInTerms(schoolId, "ม.6/1", [
                { term: semesterTwo, count: 30 },
            ], 30);
            const message =
                "ปีการศึกษาที่เลือกไม่ใช่ปีการศึกษาปัจจุบัน กรุณารีเฟรชหน้าแล้วเลือกใหม่";

            const added = await addSchoolClass("ม.6/2", 30, previousYearTerm.id);
            const updated = await updateSchoolClassStudentCount(
                classId,
                12,
                previousYearTerm.id,
            );

            expect(added).toEqual({ success: false, message });
            expect(updated).toEqual({ success: false, message });
            await expect(
                prisma.schoolClass.findMany({
                    where: { schoolId },
                    select: { name: true, expectedStudentCount: true },
                }),
            ).resolves.toEqual([{ name: "ม.6/1", expectedStudentCount: 30 }]);
            expect(await countSchoolTermRows(schoolId)).toBe(1);
        });
    });
});
