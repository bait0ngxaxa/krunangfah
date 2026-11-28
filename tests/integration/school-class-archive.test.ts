/**
 * Integration Test: archive classes with term history instead of deleting
 *
 * Deleting a class cascades its SchoolClassTerm rows, which are the
 * denominators of past screening coverage. A class with earlier-term rows is
 * archived instead, and archived classes disappear from every "classes that
 * exist now" query while past denominators stay intact.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AcademicYear } from "@prisma/client";
import { createMockUsers, mockSession } from "./helpers/auth-mock";
import {
    createTestAcademicYear,
    createTestSchool,
    createTestStudent,
    createTestTeacher,
    createTestUser,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { prisma } from "@/lib/database/prisma";
import type { ParsedStudent } from "@/lib/utils/excel-parser";

// Synthetic far-future terms isolate this suite from real and other suites' terms.
const { CURRENT_YEAR } = vi.hoisted(() => ({ CURRENT_YEAR: 2732 }));
const termState = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/lib/services/current-year-term-policy", async (importOriginal) => {
    const actual = await importOriginal<
        typeof import("@/lib/services/current-year-term-policy")
    >();
    return {
        ...actual,
        // Shared by class writes and import (checkImportTerm wraps it).
        checkCurrentYearTerm: (academicYearId: string, currentYear?: number) =>
            actual.checkCurrentYearTerm(academicYearId, currentYear ?? CURRENT_YEAR),
    };
});
vi.mock("@/lib/services/academic-year-lifecycle", () => ({
    // Real lifecycle would move isCurrent back to the clock term mid-suite.
    ensureCurrentAcademicYearLifecycle: vi.fn(async () => termState.current),
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
vi.mock("@/lib/cache/redis-idempotency", () => ({
    startIdempotentOperation: vi.fn(async () => ({ status: "unavailable" as const })),
    completeIdempotentOperation: vi.fn(),
    clearIdempotentOperation: vi.fn(),
}));

const USERS = createMockUsers("scarc");

const { addSchoolClass, getSchoolClasses, removeSchoolClass } = await import(
    "@/lib/actions/school-setup.actions"
);
const { getClassesBySchool, updateTeacherProfile } = await import(
    "@/lib/actions/user-management.actions"
);
const { getAnalyticsSummary } = await import("@/lib/actions/analytics/main");
const { getExpectedStudentCount } = await import("@/lib/actions/analytics/data");
const {
    ensureSchoolClassTermsForAcademicYear,
    hasMissingSchoolClassTermsForAcademicYear,
} = await import("@/lib/services/school-class-term-service");
const { importStudents } = await import("@/lib/actions/student/mutations");

let semesterOne: AcademicYear;
let semesterTwo: AcademicYear;
let schoolId = "";
let classCounter = 0;

function uniqueClassName(grade: number): string {
    classCounter += 1;
    return `ม.${grade}/${classCounter}`;
}

async function createClass(
    name: string,
    terms: AcademicYear[],
    count = 30,
): Promise<string> {
    const schoolClass = await prisma.schoolClass.create({
        data: { schoolId, name, expectedStudentCount: count },
    });
    await prisma.schoolClassTerm.createMany({
        data: terms.map((term) => ({
            schoolClassId: schoolClass.id,
            academicYearId: term.id,
            expectedStudentCount: count,
        })),
    });
    return schoolClass.id;
}

async function termRowIds(classId: string): Promise<string[]> {
    const rows = await prisma.schoolClassTerm.findMany({
        where: { schoolClassId: classId },
        select: { academicYearId: true },
    });
    return rows.map((row) => row.academicYearId).sort();
}

function importRow(className: string): ParsedStudent {
    return {
        studentId: `ARC-${Date.now()}`,
        nationalId: null,
        firstName: "นักเรียน",
        lastName: "สังเคราะห์",
        gender: "MALE",
        age: 13,
        class: className,
        scores: { q1: 1, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q9a: false, q9b: false },
    };
}

describe("Integration: school class archive", () => {
    beforeAll(async () => {
        semesterOne = await createTestAcademicYear({ year: CURRENT_YEAR, semester: 1 });
        semesterTwo = await createTestAcademicYear({ year: CURRENT_YEAR, semester: 2 });
        semesterTwo = await prisma.academicYear.update({
            where: { id: semesterTwo.id },
            data: { isCurrent: true },
        });
        termState.current = semesterTwo;

        schoolId = (await createTestSchool({ name: "โรงเรียนสังเคราะห์คลัง" })).id;
        USERS.schoolAdmin.schoolId = schoolId;
        USERS.classTeacher.schoolId = schoolId;
        await createTestUser(USERS.schoolAdmin, schoolId);
        await createTestUser(USERS.classTeacher, schoolId);
        await createTestUser(USERS.systemAdmin);
    });

    afterAll(async () => {
        await prisma.academicYear
            .update({ where: { id: semesterTwo.id }, data: { isCurrent: false } })
            .catch(() => {});
        await prisma.teacherInvite.deleteMany({ where: { schoolId } }).catch(() => {});
        await prisma.student.deleteMany({ where: { schoolId } }).catch(() => {});
        await cleanupAll();
    });

    it("migration added a nullable archivedAt column", async () => {
        const columns = await prisma.$queryRaw<Array<{ is_nullable: string }>>`
            SELECT is_nullable FROM information_schema.columns
            WHERE table_name = 'school_classes' AND column_name = 'archivedAt'
        `;
        expect(columns).toEqual([{ is_nullable: "YES" }]);
    });

    it("archives an emptied class with history and keeps past denominators", async () => {
        mockSession(USERS.schoolAdmin);
        const archivedName = uniqueClassName(1);
        const classId = await createClass(archivedName, [semesterOne, semesterTwo], 30);
        await createClass(uniqueClassName(2), [semesterTwo], 25);
        const student = await createTestStudent(schoolId, { class: archivedName });

        const blocked = await removeSchoolClass(classId);
        expect(blocked.success).toBe(false);
        expect(blocked.message).toContain("มีนักเรียนอยู่ 1 คน");

        // Promotion moves the students out, leaving the class empty.
        await prisma.student.update({ where: { id: student.id }, data: { class: "ม.2/9" } });
        const pastBefore = await getExpectedStudentCount(schoolId, undefined, [semesterOne.id]);
        const currentBefore = await getExpectedStudentCount(schoolId, undefined, [semesterTwo.id]);

        const result = await removeSchoolClass(classId);

        expect(result).toEqual({
            success: true,
            message: `เก็บห้อง "${archivedName}" เข้าคลังแล้ว ข้อมูลเทอมก่อนหน้ายังอยู่ครบ`,
        });
        await expect(termRowIds(classId)).resolves.toEqual([semesterOne.id]);
        const archived = await prisma.schoolClass.findUniqueOrThrow({
            where: { id: classId },
            select: { archivedAt: true },
        });
        expect(archived.archivedAt).toBeInstanceOf(Date);
        await expect(
            getExpectedStudentCount(schoolId, undefined, [semesterOne.id]),
        ).resolves.toBe(pastBefore);
        await expect(
            getExpectedStudentCount(schoolId, undefined, [semesterTwo.id]),
        ).resolves.toBe((currentBefore ?? 0) - 30);
    });

    it("hard-deletes a class that only has a current-term row", async () => {
        mockSession(USERS.schoolAdmin);
        const name = uniqueClassName(3);
        const classId = await createClass(name, [semesterTwo]);

        const result = await removeSchoolClass(classId);

        expect(result).toEqual({ success: true, message: `ลบห้อง "${name}" สำเร็จ` });
        await expect(prisma.schoolClass.count({ where: { id: classId } })).resolves.toBe(0);
    });

    describe("advisory references block removal", () => {
        const blockerCases = [
            {
                label: "a class teacher",
                expected: "ครูที่ปรึกษา 1 คน",
                seed: async (className: string) => {
                    await prisma.teacher.deleteMany({ where: { userId: USERS.classTeacher.id } });
                    await createTestTeacher(USERS.classTeacher.id, { advisoryClass: className });
                },
                clear: () =>
                    prisma.teacher.deleteMany({ where: { userId: USERS.classTeacher.id } }),
            },
            {
                label: "a roster row",
                expected: "รายชื่อครูใน roster 1 รายการ",
                seed: async (className: string) => {
                    await prisma.schoolTeacherRoster.create({
                        data: {
                            schoolId,
                            firstName: "ครู",
                            lastName: "สังเคราะห์",
                            age: 30,
                            userRole: "class_teacher",
                            advisoryClass: className,
                            schoolRole: "ครูประจำชั้น",
                            projectRole: "care",
                        },
                    });
                },
                clear: () => prisma.schoolTeacherRoster.deleteMany({ where: { schoolId } }),
            },
            {
                label: "a pending invite",
                expected: "คำเชิญครูที่ยังไม่หมดอายุ 1 รายการ",
                seed: async (className: string) => {
                    await prisma.teacherInvite.create({
                        data: inviteData(className, {
                            expiresAt: new Date(Date.now() + 86_400_000),
                        }),
                    });
                },
                clear: () => prisma.teacherInvite.deleteMany({ where: { schoolId } }),
            },
        ];

        it.each(blockerCases.flatMap((blocker) => [
            { ...blocker, withHistory: true },
            { ...blocker, withHistory: false },
        ]))(
            "$label blocks removal (history: $withHistory)",
            async ({ expected, seed, clear, withHistory }) => {
                mockSession(USERS.schoolAdmin);
                const name = uniqueClassName(4);
                const classId = await createClass(
                    name,
                    withHistory ? [semesterOne, semesterTwo] : [semesterTwo],
                );
                await seed(name);
                try {
                    const result = await removeSchoolClass(classId);

                    expect(result).toEqual({
                        success: false,
                        message: `ไม่สามารถลบห้อง "${name}" ได้ เพราะยังมี${expected} กรุณาเปลี่ยนห้องที่ปรึกษาก่อน`,
                    });
                    const after = await prisma.schoolClass.findUnique({
                        where: { id: classId },
                        select: { archivedAt: true },
                    });
                    expect(after).toEqual({ archivedAt: null });
                } finally {
                    await clear();
                }
            },
        );

        it("expired or accepted invites and soft-deleted teachers do not block", async () => {
            mockSession(USERS.schoolAdmin);
            const name = uniqueClassName(5);
            const classId = await createClass(name, [semesterTwo]);
            await prisma.teacherInvite.createMany({
                data: [
                    inviteData(name, { expiresAt: new Date(Date.now() - 60_000) }),
                    inviteData(name, {
                        expiresAt: new Date(Date.now() + 86_400_000),
                        acceptedAt: new Date(),
                    }),
                ],
            });
            await createTestUser({ ...USERS.otherTeacher, schoolId }, schoolId);
            await prisma.teacher.upsert({
                where: { userId: USERS.otherTeacher.id },
                create: {
                    userId: USERS.otherTeacher.id,
                    firstName: "ครู",
                    lastName: "ลบแล้ว",
                    age: 40,
                    advisoryClass: name,
                    schoolRole: "ครูประจำชั้น",
                    projectRole: "care",
                },
                update: { advisoryClass: name },
            });
            await prisma.user.update({
                where: { id: USERS.otherTeacher.id },
                data: { deletedAt: new Date() },
            });

            try {
                const result = await removeSchoolClass(classId);
                expect(result.success).toBe(true);
            } finally {
                await prisma.teacherInvite.deleteMany({ where: { schoolId } });
                await prisma.teacher.deleteMany({ where: { userId: USERS.otherTeacher.id } });
            }
        });
    });

    describe("archived classes are not current classes", () => {
        let archivedName = "";
        let archivedId = "";
        let activeName = "";

        beforeAll(async () => {
            archivedName = uniqueClassName(6);
            activeName = uniqueClassName(6);
            archivedId = await createClass(archivedName, [semesterOne, semesterTwo]);
            await createClass(activeName, [semesterOne, semesterTwo]);
            mockSession(USERS.schoolAdmin);
            const result = await removeSchoolClass(archivedId);
            expect(result.message).toContain("เก็บห้อง");
        });

        it("rollover provisions only active classes and reports nothing missing", async () => {
            const nextTerm = await createTestAcademicYear({ year: CURRENT_YEAR + 1, semester: 1 });
            const schools = await prisma.school.findMany({
                where: { disabledAt: null, isTestData: false },
                select: { id: true },
            });
            // Same work rollover does for a new current term.
            for (const school of schools) {
                await ensureSchoolClassTermsForAcademicYear(school.id, nextTerm.id);
            }

            await expect(
                prisma.schoolClassTerm.count({
                    where: { schoolClassId: archivedId, academicYearId: nextTerm.id },
                }),
            ).resolves.toBe(0);
            await expect(
                prisma.schoolClassTerm.count({
                    where: { schoolClass: { schoolId, name: activeName }, academicYearId: nextTerm.id },
                }),
            ).resolves.toBe(1);
            await expect(hasMissingSchoolClassTermsForAcademicYear(nextTerm.id)).resolves.toBe(false);
        });

        it("is absent from class lists and analytics class filters", async () => {
            mockSession(USERS.schoolAdmin);
            const schoolClasses = await getSchoolClasses();
            expect(schoolClasses.status).toBe("success");
            if (schoolClasses.status !== "success") throw new Error("Expected classes");
            const listed = schoolClasses.data.map((c) => c.name);
            expect(listed).toContain(activeName);
            expect(listed).not.toContain(archivedName);

            mockSession(USERS.systemAdmin);
            const bySchool = (await getClassesBySchool(schoolId)).map((c) => c.name);
            expect(bySchool).toContain(activeName);
            expect(bySchool).not.toContain(archivedName);

            const analytics = await getAnalyticsSummary(undefined, schoolId, CURRENT_YEAR, 2);
            expect(analytics.status).toBe("success");
            if (analytics.status !== "success") throw new Error("Expected analytics");
            expect(analytics.data.availableClasses).toContain(activeName);
            expect(analytics.data.availableClasses).not.toContain(archivedName);
        });

        it("rejects assigning a teacher to an archived class", async () => {
            await prisma.teacher.deleteMany({ where: { userId: USERS.classTeacher.id } });
            await createTestTeacher(USERS.classTeacher.id, { advisoryClass: activeName });
            mockSession(USERS.schoolAdmin);

            const result = await updateTeacherProfile(USERS.classTeacher.id, {
                advisoryClass: archivedName,
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain("ไม่พบห้องเรียนนี้ในโรงเรียน");
            await prisma.teacher.deleteMany({ where: { userId: USERS.classTeacher.id } });
        });

        it("rejects importing into an archived class with its own message", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await importStudents([importRow(archivedName)], semesterTwo.id, 1);

            expect(result.failedStudents?.map((s) => s.reason)).toEqual([
                `ห้อง "${archivedName}" ถูกเก็บเข้าคลังแล้ว กรุณาเพิ่มห้องนี้อีกครั้งในหน้าจัดการห้องเรียนก่อนนำเข้า`,
            ]);
            await expect(
                prisma.student.count({ where: { schoolId, class: archivedName } }),
            ).resolves.toBe(0);
        });

        it("restores the archived class when its name is added again", async () => {
            mockSession(USERS.schoolAdmin);

            const result = await addSchoolClass(archivedName, 27);

            expect(result).toMatchObject({
                success: true,
                data: { id: archivedId, name: archivedName, expectedStudentCount: 27 },
            });
            const restored = await prisma.schoolClass.findUniqueOrThrow({
                where: { id: archivedId },
                select: {
                    archivedAt: true,
                    terms: { select: { academicYearId: true, expectedStudentCount: true } },
                },
            });
            expect(restored.archivedAt).toBeNull();
            expect(restored.terms).toEqual(
                expect.arrayContaining([
                    // History is kept as it was.
                    { academicYearId: semesterOne.id, expectedStudentCount: 30 },
                    { academicYearId: semesterTwo.id, expectedStudentCount: 27 },
                ]),
            );

            const duplicate = await addSchoolClass(archivedName, 27);
            expect(duplicate).toEqual({
                success: false,
                message: `ห้อง "${archivedName}" มีอยู่แล้ว`,
            });
        });
    });
});

function inviteData(
    advisoryClass: string,
    overrides: { expiresAt: Date; acceptedAt?: Date },
) {
    return {
        token: `arc-${advisoryClass}-${Math.random().toString(36).slice(2)}`,
        email: `invite-${Math.random().toString(36).slice(2)}@test.local`,
        firstName: "ครู",
        lastName: "เชิญ",
        age: 30,
        userRole: "class_teacher" as const,
        advisoryClass,
        schoolId,
        schoolRole: "ครูประจำชั้น",
        projectRole: "care" as const,
        invitedById: USERS.schoolAdmin.id,
        ...overrides,
    };
}
