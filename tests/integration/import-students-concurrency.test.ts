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
    createTestTeacher,
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
const OTHER_SCHOOL_USERS = createMockUsers("import-other-school");
const NATIONAL_ID_BASE = Date.now() * 10;
const { requireAuth } = await import("@/lib/auth/session");
const { importStudents, updateStudentProfile } = await import("@/lib/actions/student/mutations");

describe("Integration: concurrent student imports", () => {
    let schoolId = "";
    let otherSchoolId = "";
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
        otherSchoolId = (await createTestSchool({ name: `Import Other School ${suffix}` })).id;
        USERS_A.schoolAdmin.schoolId = school.id;
        USERS_B.schoolAdmin.schoolId = school.id;
        USERS_A.classTeacher.schoolId = school.id;
        OTHER_SCHOOL_USERS.schoolAdmin.schoolId = otherSchoolId;

        await Promise.all([
            createTestUser(USERS_A.schoolAdmin, school.id),
            createTestUser(USERS_B.schoolAdmin, school.id),
            createTestUser(USERS_A.classTeacher, school.id),
            createTestUser(OTHER_SCHOOL_USERS.schoolAdmin, otherSchoolId),
        ]);
        await createTestTeacher(USERS_A.classTeacher.id, { advisoryClass: "ม.1/1" });
        await prisma.schoolClass.createMany({
            data: [
                { schoolId, name: "ม.1/1", expectedStudentCount: 30 },
                { schoolId, name: "ม.1/2", expectedStudentCount: 30 },
                { schoolId: otherSchoolId, name: "ม.1/1", expectedStudentCount: 30 },
            ],
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
        const schoolIds = [schoolId, otherSchoolId].filter(Boolean);
        const schoolScope = { schoolId: { in: schoolIds } };
        await prisma.student.deleteMany({ where: schoolScope });
        await prisma.schoolClass.deleteMany({ where: schoolScope });
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

    it.each([true, false])("counts one Student across overlapping imports (has ID: %s)", async (hasId) => {
        const studentId = `CONCURRENT-NEW-${suffix}`;
        const nationalId = hasId ? createNationalId(2) : null;
        const scopedStudentId = nationalId === null ? `${studentId}-NULL` : studentId;
        const row = createImportRow({ studentId: scopedStudentId, nationalId });

        const results = await runConcurrentImports(
            [USERS_A.schoolAdmin, USERS_B.schoolAdmin],
            [
                () => importStudents([row], firstAcademicYearId, 1),
                () => importStudents([row], secondAcademicYearId, 1),
            ],
        );

        const students = await prisma.student.findMany({
            where: { schoolId, studentId: scopedStudentId },
            select: { id: true, nationalId: true },
        });
        expect(students).toHaveLength(1);
        const student = students[0];
        if (!student) throw new Error("Concurrent import did not create student");
        expect(student.nationalId).toBe(nationalId);
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
        expect(results.map(({ imported, phqCreated, updatedStudents }) =>
            [imported, phqCreated, updatedStudents],
        )).toEqual([[1, 1, 0], [1, 1, 0]]);
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

    it("creates round 1 activities and allows round 2 without completing them", async () => {
        const academicYear = await createTestAcademicYear({
            year: 9000 + Number(suffix.slice(-5)),
            semester: 1,
        });
        const studentId = `ROUND-FLOW-${suffix}`;
        const nationalId = createNationalId(10);
        const row = createImportRow({
            studentId,
            nationalId,
            scores: {
                q1: 3,
                q2: 3,
                q3: 3,
                q4: 3,
                q5: 3,
                q6: 0,
                q7: 0,
                q8: 0,
                q9: 0,
                q9a: false,
                q9b: false,
            },
        });
        const expires = new Date(Date.now() + 86_400_000).toISOString();
        vi.mocked(requireAuth).mockResolvedValue({
            user: toSessionUser(USERS_A.schoolAdmin),
            expires,
        });

        const round1Result = await importStudents(
            [row],
            academicYear.id,
            1,
        );
        const student = await prisma.student.findFirstOrThrow({
            where: { schoolId, studentId },
        });
        const round1Phq = await prisma.phqResult.findUniqueOrThrow({
            where: {
                studentId_academicYearId_assessmentRound: {
                    studentId: student.id,
                    academicYearId: academicYear.id,
                    assessmentRound: 1,
                },
            },
        });
        const round1Progress = await prisma.activityProgress.findMany({
            where: { phqResultId: round1Phq.id },
            orderBy: { activityNumber: "asc" },
            select: { activityNumber: true, status: true },
        });
        const round1ProgressRows = await prisma.activityProgress.findMany({
            where: { phqResultId: round1Phq.id },
            select: { id: true },
        });
        const round1WorksheetCount = await prisma.worksheetUpload.count({
            where: {
                activityProgressId: {
                    in: round1ProgressRows.map((progress) => progress.id),
                },
            },
        });

        expect(round1Result).toMatchObject({
            success: true,
            imported: 1,
            phqCreated: 1,
        });
        expect(round1Progress).toEqual([
            { activityNumber: 1, status: "in_progress" },
            { activityNumber: 2, status: "locked" },
            { activityNumber: 3, status: "locked" },
            { activityNumber: 4, status: "locked" },
            { activityNumber: 5, status: "locked" },
        ]);
        expect(round1WorksheetCount).toBe(0);

        const round2Result = await importStudents([row], academicYear.id, 2);
        const round2Phq = await prisma.phqResult.findUniqueOrThrow({
            where: {
                studentId_academicYearId_assessmentRound: {
                    studentId: student.id,
                    academicYearId: academicYear.id,
                    assessmentRound: 2,
                },
            },
        });
        const round2ProgressCount = await prisma.activityProgress.count({
            where: { phqResultId: round2Phq.id },
        });

        expect(round2Result).toMatchObject({
            success: true,
            imported: 1,
            phqCreated: 1,
        });
        expect(round2ProgressCount).toBe(0);

        const otherAcademicYear = await createTestAcademicYear({
            year: 9100 + Number(suffix.slice(-5)),
            semester: 2,
        });
        const otherTermRow = createImportRow({
            studentId: `ROUND-FLOW-OTHER-TERM-${suffix}`,
            nationalId: createNationalId(11),
            scores: row.scores,
        });
        await expect(
            importStudents([otherTermRow], otherAcademicYear.id, 1),
        ).resolves.toMatchObject({ success: true, imported: 1 });

        const missingRound1Result = await importStudents(
            [otherTermRow],
            academicYear.id,
            2,
        );

        expect(missingRound1Result).toMatchObject({
            success: false,
            imported: 0,
            phqCreated: 0,
            duplicateRoundsSkipped: 1,
        });
    });

    it("imports ten null identifiers alongside Thai IDs and G Codes and safely repeats assessments", async () => {
        signIn(USERS_A.schoolAdmin);
        const rows = Array.from({ length: 12 }, (_, index) => createImportRow({
            studentId: `MIXED-${index}-${suffix}`,
            nationalId: index === 10 ? createNationalId(20).slice(1)
                : index === 11 ? createNationalId(21).toLowerCase()
                : null,
        }));
        const [first] = rows;
        const numeric = rows[10];
        const gCode = rows[11];
        const studentWhere = { schoolId, studentId: { in: rows.map((row) => row.studentId) } };

        await expect(importStudents(rows, firstAcademicYearId, 1)).resolves.toMatchObject({
            success: true, imported: 12, createdStudents: 12, updatedStudents: 0, phqCreated: 12,
        });
        await expect(prisma.student.count({ where: { ...studentWhere, nationalId: null } }))
            .resolves.toBe(10);
        await expect(prisma.student.count({
            where: { ...studentWhere, nationalId: gCode.nationalId?.toUpperCase() },
        })).resolves.toBe(1);

        const movedStudent = { ...first, lastName: "พร้อมกน", class: "ม.1/2" };
        const round2 = [movedStudent, { ...numeric, nationalId: null }];
        await expect(importStudents(round2, firstAcademicYearId, 2)).resolves.toMatchObject({
            success: true, imported: 2, createdStudents: 0, updatedStudents: 1, phqCreated: 2,
        });
        await expect(importStudents(round2, firstAcademicYearId, 2)).resolves.toMatchObject({
            success: false, imported: 0, duplicateRoundsSkipped: 2,
        });
        const students = await prisma.student.findMany({
            where: { schoolId, studentId: { in: [first.studentId, numeric.studentId] } },
            include: { phqResults: { select: { assessmentRound: true }, orderBy: { assessmentRound: "asc" } } },
        });
        expect(students).toHaveLength(2);
        expect(students.find((student) => student.studentId === first.studentId)).toMatchObject({
            nationalId: null, lastName: movedStudent.lastName, class: movedStudent.class,
        });
        expect(students.find((student) => student.studentId === numeric.studentId)?.nationalId)
            .toBe(numeric.nationalId);
        for (const student of students) {
            expect(student.phqResults).toEqual([{ assessmentRound: 1 }, { assessmentRound: 2 }]);
        }
    });

    it("enriches the original student without moving any PHQ or care history", async () => {
        signIn(USERS_A.schoolAdmin);
        const row = createImportRow({ studentId: `ENRICH-${suffix}`, nationalId: null });
        row.scores = { ...row.scores, q1: 3, q2: 3, q3: 3, q4: 3, q5: 3 };
        await expect(importStudents([row], firstAcademicYearId, 1)).resolves.toMatchObject({
            success: true, createdStudents: 1,
        });
        const original = await prisma.student.findUniqueOrThrow({
            where: { studentId_schoolId: { studentId: row.studentId, schoolId } },
            include: { phqResults: true, activityProgress: { orderBy: { activityNumber: "asc" } } },
        });
        const [firstPhq] = original.phqResults;
        expect(original.activityProgress).toHaveLength(5);
        const date = new Date();
        const counselor = USERS_A.schoolAdmin;
        const [counseling, visit, referral] = await Promise.all([
            prisma.counselingSession.create({ data: {
                studentId: original.id, academicYearId: firstAcademicYearId, sessionNumber: 1,
                sessionDate: date, counselorName: counselor.name, summary: "ทดสอบการติดตาม",
            } }),
            prisma.homeVisit.create({ data: {
                studentId: original.id, academicYearId: firstAcademicYearId, visitNumber: 1,
                visitDate: date, description: "ทดสอบเยี่ยมบ้าน", teacherName: counselor.name,
                teacherRole: "school_admin",
            } }),
            prisma.studentReferral.create({ data: {
                studentId: original.id, fromTeacherUserId: counselor.id, toTeacherUserId: USERS_A.classTeacher.id,
            } }),
        ]);
        await prisma.student.update({ where: { id: original.id }, data: { activeReferralId: referral.id } });

        const nationalId = createNationalId(22);
        await expect(importStudents([{
            ...row, firstName: "บุคคลอื่น", lastName: "คนละนามสกุล", nationalId,
        }], firstAcademicYearId, 2)).resolves.toMatchObject({
            success: false, identityConflicts: 1, updatedStudents: 0,
            errors: [expect.stringContaining("ชื่อหรือนามสกุลไม่ตรง")],
        });
        await expect(importStudents([{ ...row, nationalId: createNationalId(1) }], firstAcademicYearId, 2))
            .resolves.toMatchObject({ success: false, identityConflicts: 1, updatedStudents: 0 });
        await expect(importStudents([{ ...row, nationalId }], firstAcademicYearId, 2)).resolves.toMatchObject({
            success: true, createdStudents: 0, updatedStudents: 1, phqCreated: 1,
        });
        const replacement = createNationalId(23);
        const conflict = await importStudents([{ ...row, nationalId: replacement }], secondAcademicYearId, 1);
        expect(conflict).toMatchObject({ success: false, identityConflicts: 1, updatedStudents: 0 });
        expect(JSON.stringify(conflict)).not.toContain(replacement);

        const enriched = await prisma.student.findUniqueOrThrow({
            where: { studentId_schoolId: { studentId: row.studentId, schoolId } },
            include: {
                phqResults: { orderBy: { assessmentRound: "asc" } },
                activityProgress: { orderBy: { activityNumber: "asc" } },
                counselingSessions: true, homeVisits: true, referralHistory: true,
            },
        });
        expect(enriched).toMatchObject({ id: original.id, nationalId, activeReferralId: referral.id });
        expect(enriched.phqResults.map(({ id, assessmentRound }) => ({ id, assessmentRound }))).toEqual([
            { id: firstPhq.id, assessmentRound: 1 },
            { id: expect.any(String), assessmentRound: 2 },
        ]);
        expect(enriched.activityProgress).toEqual(original.activityProgress);
        expect(enriched.counselingSessions).toEqual([counseling]);
        expect(enriched.homeVisits).toEqual([visit]);
        expect(enriched.referralHistory).toEqual([referral]);

        const { studentId, firstName, lastName, gender, age } = row;
        const profile = { studentId, firstName, lastName, gender, age, class: row.class, status: "ACTIVE" };
        const context = { activePhqResultId: enriched.phqResults[1].id };
        await expect(updateStudentProfile(original.id, { ...profile, nationalId: "" }, context))
            .resolves.toMatchObject({ success: true, student: { id: original.id, nationalId: null } });
        await expect(updateStudentProfile(original.id, { ...profile, nationalId }, context))
            .resolves.toMatchObject({ success: true, student: { id: original.id, nationalId } });
    });

    it("keeps codes school-scoped and enforces both classroom boundaries", async () => {
        const row = createImportRow({ studentId: `SCOPED-${suffix}`, nationalId: null });
        signIn(USERS_A.schoolAdmin);
        await expect(importStudents([
            { ...row, class: "ม.1/2" },
            { ...row, class: "ม.1/2" },
        ], firstAcademicYearId, 1)).resolves.toMatchObject({
            status: "partial", createdStudents: 1, phqCreated: 1,
            errors: [expect.stringContaining("พบรหัสนักเรียนซ้ำ")],
        });

        signIn(USERS_A.classTeacher);
        const newRow = { ...row, studentId: `${row.studentId}-NEW`, class: "ม.1/2" };
        await expect(importStudents([row, newRow], secondAcademicYearId, 1)).resolves.toMatchObject({
            success: false, skipped: 2, phqCreated: 0, identityConflicts: 0,
        });
        const existingScope = { studentId_schoolId: { studentId: row.studentId, schoolId } };
        await expect(prisma.student.findUniqueOrThrow({ where: existingScope }))
            .resolves.toMatchObject({ class: "ม.1/2", nationalId: null });
        await expect(prisma.student.count({ where: { studentId: newRow.studentId } })).resolves.toBe(0);

        signIn(OTHER_SCHOOL_USERS.schoolAdmin);
        await expect(importStudents([{ ...row, nationalId: createNationalId(1) }], firstAcademicYearId, 1))
            .resolves.toMatchObject({ success: false, identityConflicts: 1, createdStudents: 0 });
        await expect(importStudents([row], firstAcademicYearId, 1)).resolves.toMatchObject({
            success: true, createdStudents: 1, phqCreated: 1,
        });
        const schoolRecords = await prisma.student.findMany({
            where: { schoolId: { in: [schoolId, otherSchoolId] }, studentId: row.studentId },
            select: { id: true, schoolId: true, nationalId: true },
        });
        expect(schoolRecords).toEqual(expect.arrayContaining([
            expect.objectContaining({ schoolId, nationalId: null }),
            expect.objectContaining({ schoolId: otherSchoolId, nationalId: null }),
        ]));
        expect(new Set(schoolRecords.map((student) => student.id)).size).toBe(2);
    });

    it("lets only one concurrent import enrich a student with the same new identifier", async () => {
        signIn(USERS_A.schoolAdmin);
        const rows = [1, 2].map((number) => createImportRow({
            studentId: `CLAIM-${number}-${suffix}`, nationalId: null,
        }));
        await expect(importStudents(rows, firstAcademicYearId, 1)).resolves.toMatchObject({ createdStudents: 2 });
        const nationalId = createNationalId(24);
        const results = await runConcurrentImports([USERS_A.schoolAdmin, USERS_B.schoolAdmin], [
            () => importStudents([{ ...rows[0], nationalId }], firstAcademicYearId, 2),
            () => importStudents([{ ...rows[1], nationalId }], firstAcademicYearId, 2),
        ]);
        expect(results).toEqual(expect.arrayContaining([
            expect.objectContaining({ success: true, imported: 1, updatedStudents: 1, createdStudents: 0 }),
            expect.objectContaining({ success: false, imported: 0, updatedStudents: 0, identityConflicts: 1 }),
        ]));
        const students = await prisma.student.findMany({
            where: { schoolId, studentId: { in: rows.map((row) => row.studentId) } },
            include: { phqResults: { orderBy: { assessmentRound: "asc" } } },
        });
        expect(students.filter((student) => student.nationalId === nationalId)).toHaveLength(1);
        expect(students.filter((student) => student.nationalId === null)).toHaveLength(1);
        for (const student of students) {
            expect(student.phqResults.map((result) => result.assessmentRound))
                .toEqual(student.nationalId === nationalId ? [1, 2] : [1]);
        }
    });
});

function signIn(user: MockUser): void {
    vi.mocked(requireAuth).mockResolvedValue({
        user: toSessionUser(user),
        expires: new Date(Date.now() + 86_400_000).toISOString(),
    });
}

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
    nationalId: string | null;
    scores?: ParsedStudent["scores"];
}): ParsedStudent {
    return {
        studentId: input.studentId,
        nationalId: input.nationalId,
        firstName: "นักเรียน",
        lastName: "พร้อมกัน",
        gender: "MALE",
        age: 13,
        class: "ม.1/1",
        scores: input.scores ?? {
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
