import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ParsedStudent } from "@/lib/utils/excel-parser";
import type { ImportResult } from "@/lib/actions/student/types";
import { prisma } from "@/lib/database/prisma";
import { createMockUsers, mockSession, setupAuthMocks } from "./helpers/auth-mock";
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
vi.mock("@/lib/actions/analytics/cache", () => ({ revalidateAnalyticsCache: vi.fn() }));

setupAuthMocks();

const USERS = createMockUsers("import-numeric");
const OTHER_USERS = createMockUsers("import-numeric-other");
const CONCURRENCY_ADMIN = createMockUsers("import-numeric-concurrency").schoolAdmin;
const NATIONAL_ID_BASE = Date.now() * 10;
const ACK = { numericIdAcknowledged: true };
const ACK_REJECTION = {
    success: false,
    status: "error",
    message: "ต้องยืนยันการนำเข้ารหัสนักเรียนที่เป็นตัวเลขก่อน กรุณาลองใหม่",
};
const { importStudents } = await import("@/lib/actions/student/mutations");

interface RowOptions {
    numeric?: boolean;
    nationalId?: string | null;
    firstName?: string;
    className?: string;
}

function row(studentId: string, options: RowOptions = {}): ParsedStudent {
    return {
        studentId,
        ...(options.numeric ? { numericStudentId: true } : {}),
        nationalId: options.nationalId ?? null,
        firstName: options.firstName ?? "ตัวเลข",
        lastName: "นำเข้า",
        gender: "MALE",
        age: 13,
        class: options.className ?? "ม.1/1",
        scores: { q1: 1, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q9a: false, q9b: false },
    };
}

function nationalId(offset: number): string {
    return `G${String(NATIONAL_ID_BASE + offset).padStart(13, "0").slice(-13)}`;
}

describe("Integration: numeric student code import", () => {
    let schoolId = "";
    let otherSchoolId = "";
    let yearId = "";

    async function phqCountsByCode(codes: string[]): Promise<Record<string, number>> {
        const students = await prisma.student.findMany({
            where: { schoolId, studentId: { in: codes } },
            select: { studentId: true, _count: { select: { phqResults: true } } },
        });
        return Object.fromEntries(students.map((student) => [student.studentId, student._count.phqResults]));
    }

    beforeAll(async () => {
        const suffix = String(Date.now()).slice(-8);
        schoolId = (await createTestSchool({ name: `Numeric Import ${suffix}` })).id;
        otherSchoolId = (await createTestSchool({ name: `Numeric Import Other ${suffix}` })).id;
        USERS.schoolAdmin.schoolId = schoolId;
        USERS.classTeacher.schoolId = schoolId;
        OTHER_USERS.schoolAdmin.schoolId = otherSchoolId;
        await Promise.all([
            createTestUser(USERS.schoolAdmin, schoolId),
            createTestUser(USERS.classTeacher, schoolId),
            createTestUser(OTHER_USERS.schoolAdmin, otherSchoolId),
        ]);
        await createTestTeacher(USERS.classTeacher.id, { advisoryClass: "ม.1/1" });
        await prisma.schoolClass.createMany({
            data: [
                { schoolId, name: "ม.1/1", expectedStudentCount: 40 },
                { schoolId, name: "ม.1/2", expectedStudentCount: 40 },
                { schoolId: otherSchoolId, name: "ม.1/1", expectedStudentCount: 40 },
            ],
        });
        yearId = (await createTestAcademicYear({ year: 7700 + Number(suffix.slice(-5)), semester: 1 })).id;
    });

    afterAll(async () => {
        const schoolScope = { schoolId: { in: [schoolId, otherSchoolId].filter(Boolean) } };
        await prisma.student.deleteMany({ where: schoolScope });
        await prisma.schoolClass.deleteMany({ where: schoolScope });
        await cleanupAll();
    });

    it("imports a text-only template unchanged", async () => {
        mockSession(USERS.schoolAdmin);

        await expect(importStudents([row("T-100"), row("00101")], yearId, 1))
            .resolves.toMatchObject({ success: true, status: "success", createdStudents: 2, phqCreated: 2 });
        await expect(phqCountsByCode(["T-100", "00101", "101"])).resolves.toEqual({ "T-100": 1, "00101": 1 });
    });

    it("imports 30 new numeric students after one acknowledgement", async () => {
        mockSession(USERS.schoolAdmin);
        const codes = Array.from({ length: 30 }, (_, index) => String(5000 + index));
        const rows = codes.map((code) => row(code, { numeric: true }));

        await expect(importStudents(rows, yearId, 1)).resolves.toEqual(ACK_REJECTION);
        await expect(prisma.student.count({ where: { schoolId, studentId: { in: codes } } })).resolves.toBe(0);

        await expect(importStudents(rows, yearId, 1, ACK))
            .resolves.toMatchObject({ success: true, createdStudents: 30, phqCreated: 30 });
        const counts = await phqCountsByCode(codes);
        expect(Object.keys(counts).sort()).toEqual(codes);
        expect(Object.values(counts).every((count) => count === 1)).toBe(true);
    });

    it("imports a mixed numeric and text batch with codes stored as given", async () => {
        mockSession(USERS.schoolAdmin);

        await expect(importStudents([row("6001", { numeric: true }), row("06002"), row("M-6003")], yearId, 1, ACK))
            .resolves.toMatchObject({ success: true, createdStudents: 3 });
        await expect(phqCountsByCode(["6001", "06002", "6002", "M-6003"]))
            .resolves.toEqual({ "6001": 1, "06002": 1, "M-6003": 1 });
    });

    it("attaches a round 2 numeric code to the stored zero-prefixed student with matching identity", async () => {
        mockSession(USERS.schoolAdmin);
        await importStudents([row("00777")], yearId, 1);

        const result = await importStudents([row("777", { numeric: true })], yearId, 2);

        expect(result).toMatchObject({ success: true, createdStudents: 0, phqCreated: 1 });
        expect(result.importedStudents).toEqual([
            expect.objectContaining({ studentId: "00777", sourceStudentId: "777" }),
        ]);
        await expect(phqCountsByCode(["00777", "777"])).resolves.toEqual({ "00777": 2 });
    });

    it("keeps a weak-evidence numeric code in review without any mutation", async () => {
        mockSession(USERS.schoolAdmin);
        await importStudents([row("00888", { firstName: "ก" })], yearId, 1);
        const before = await prisma.student.findFirstOrThrow({ where: { schoolId, studentId: "00888" } });

        const result = await importStudents([row("888", { numeric: true, firstName: "ข" })], yearId, 2, ACK);

        expect(result).toMatchObject({ success: false, identityConflicts: 1, phqCreated: 0 });
        expect(result.failedStudents?.[0]?.reason).toContain("ให้แก้รหัสในไฟล์เป็น 00888");
        await expect(prisma.student.findFirstOrThrow({ where: { id: before.id } })).resolves.toEqual(before);
        await expect(phqCountsByCode(["00888", "888"])).resolves.toEqual({ "00888": 1 });
    });

    it("returns partial counts for mixed valid, numeric and conflicting rows", async () => {
        mockSession(USERS.schoolAdmin);
        await importStudents([row("C-1", { nationalId: nationalId(1) })], yearId, 1);

        const result = await importStudents(
            [row("C-2"), row("9100", { numeric: true }), row("C-3", { nationalId: nationalId(1) })],
            yearId,
            1,
            ACK,
        );

        expect(result).toMatchObject({ status: "partial", imported: 2, createdStudents: 2, identityConflicts: 1 });
        await expect(phqCountsByCode(["C-1", "C-2", "C-3", "9100"]))
            .resolves.toEqual({ "C-1": 1, "C-2": 1, "9100": 1 });
    });

    it("does not let a class teacher reach or see a resolved student in another class", async () => {
        mockSession(USERS.schoolAdmin);
        await importStudents([row("00444", { className: "ม.1/2" })], yearId, 1);
        mockSession(USERS.classTeacher);

        const result = await importStudents([row("444", { numeric: true })], yearId, 1, ACK);

        expect(result).toMatchObject({ success: false, imported: 0, skipped: 1 });
        expect(JSON.stringify(result)).not.toContain("00444");
        await expect(phqCountsByCode(["00444", "444"])).resolves.toEqual({ "00444": 1 });
        await expect(prisma.student.findFirstOrThrow({ where: { schoolId, studentId: "00444" } }))
            .resolves.toMatchObject({ class: "ม.1/2" });
    });

    it("gives a class teacher a non-disclosing conflict when a weak candidate is in another class", async () => {
        mockSession(USERS.schoolAdmin);
        await importStudents([row("00445", { className: "ม.1/2", firstName: "ก" })], yearId, 1);
        const before = await prisma.student.findFirstOrThrow({ where: { schoolId, studentId: "00445" } });
        mockSession(USERS.classTeacher);

        const result = await importStudents([row("445", { numeric: true, firstName: "ข" })], yearId, 1, ACK);

        expect(result).toMatchObject({ success: false, imported: 0, skipped: 0, identityConflicts: 1 });
        expect(result.failedStudents?.[0]?.reason).toBe(
            "รหัสนักเรียน 445 อาจซ้ำกับนักเรียนที่มีในระบบ กรุณาติดต่อผู้ดูแลระบบของโรงเรียนเพื่อตรวจสอบรหัสก่อนนำเข้า",
        );
        expect(JSON.stringify(result)).not.toContain("00445");
        await expect(prisma.student.findFirstOrThrow({ where: { id: before.id } })).resolves.toEqual(before);
        await expect(phqCountsByCode(["00445", "445"])).resolves.toEqual({ "00445": 1 });
    });

    it("neither matches nor discloses a zero-prefixed code from another school", async () => {
        const foreign = await createTestStudent(otherSchoolId, { studentId: "00555", class: "ม.1/1" });
        mockSession(USERS.schoolAdmin);

        const result = await importStudents([row("555", { numeric: true })], yearId, 1, ACK);

        expect(result).toMatchObject({ success: true, createdStudents: 1 });
        expect(JSON.stringify(result)).not.toContain("00555");
        await expect(prisma.phqResult.count({ where: { studentId: foreign.id } })).resolves.toBe(0);
        await expect(phqCountsByCode(["555"])).resolves.toEqual({ "555": 1 });
    });
});

describe("Integration: numeric student code concurrency and idempotency", () => {
    let schoolId = "";
    let yearId = "";

    beforeAll(async () => {
        const suffix = String(Date.now()).slice(-8);
        schoolId = (await createTestSchool({ name: `Numeric Concurrency ${suffix}` })).id;
        CONCURRENCY_ADMIN.schoolId = schoolId;
        await createTestUser(CONCURRENCY_ADMIN, schoolId);
        await prisma.schoolClass.create({ data: { schoolId, name: "ม.1/1", expectedStudentCount: 40 } });
        yearId = (await createTestAcademicYear({ year: 7701 + Number(suffix.slice(-5)), semester: 1 })).id;
        mockSession(CONCURRENCY_ADMIN);
    });

    afterAll(async () => {
        await prisma.student.deleteMany({ where: { schoolId } });
        await prisma.schoolClass.deleteMany({ where: { schoolId } });
        await cleanupAll();
    });

    async function codes(studentIds: string[]): Promise<Record<string, number>> {
        const students = await prisma.student.findMany({
            where: { schoolId, studentId: { in: studentIds } },
            select: { studentId: true, _count: { select: { phqResults: true } } },
        });
        return Object.fromEntries(students.map((student) => [student.studentId, student._count.phqResults]));
    }

    it("converges duplicate confirmed submissions to one set of students and PHQ results", async () => {
        const rows = [row("7100", { numeric: true }), row("7101", { numeric: true })];

        const results = await Promise.all([
            importStudents(rows, yearId, 1, ACK),
            importStudents(rows, yearId, 1, ACK),
        ]);

        await expect(codes(["7100", "7101"])).resolves.toEqual({ "7100": 1, "7101": 1 });
        expect(results.reduce((sum, result) => sum + (result.imported ?? 0), 0)).toBe(2);
    });

    it("converges a concurrent zero-prefixed text create and a numeric create to a serial outcome", async () => {
        const results: [ImportResult, ImportResult] = await Promise.all([
            importStudents([row("00333")], yearId, 1),
            importStudents([row("333", { numeric: true })], yearId, 1, ACK),
        ]);

        const state = await codes(["00333", "333"]);
        // Numeric first: "333" was created before "00333" existed (text codes stay distinct).
        // Text first: the numeric row must see "00333" and resolve to it, so no "333" exists.
        const numericCreated = results[1].createdStudents === 1;
        expect(state).toEqual(numericCreated ? { "00333": 1, "333": 1 } : { "00333": 1 });
        expect(results[0]).toMatchObject({ success: true, createdStudents: 1 });
    });

    it("cannot create a second PHQ result by re-importing a code as Number and then as Text", async () => {
        await importStudents([row("8200", { numeric: true })], yearId, 1, ACK);
        await expect(importStudents([row("8200")], yearId, 1))
            .resolves.toMatchObject({ success: false, duplicateRoundsSkipped: 1, phqCreated: 0 });

        await importStudents([row("08300")], yearId, 1);
        await expect(importStudents([row("8300", { numeric: true })], yearId, 1, ACK))
            .resolves.toMatchObject({ success: false, duplicateRoundsSkipped: 1, phqCreated: 0, createdStudents: 0 });

        await expect(codes(["8200", "08300", "8300"])).resolves.toEqual({ "8200": 1, "08300": 1 });
    });
});
