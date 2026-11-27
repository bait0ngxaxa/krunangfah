import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedStudent } from "@/lib/utils/excel-parser";

const mocks = vi.hoisted(() => ({
    requireAuth: vi.fn(),
    userFindUnique: vi.fn(),
    schoolClassFindMany: vi.fn(),
    transaction: vi.fn(),
    queryRaw: vi.fn(),
    studentFindMany: vi.fn(),
    studentCreateMany: vi.fn(),
    studentUpdate: vi.fn(),
    phqResultFindMany: vi.fn(),
    phqResultCreateMany: vi.fn(),
    ensureSchoolClassTermsForAcademicYear: vi.fn(),
    startIdempotentOperation: vi.fn(),
    completeIdempotentOperation: vi.fn(),
    clearIdempotentOperation: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        user: { findUnique: mocks.userFindUnique },
        schoolClass: { findMany: mocks.schoolClassFindMany },
        phqResult: { count: vi.fn() },
        $transaction: mocks.transaction,
    },
}));
vi.mock("@/lib/services/school-class-term-service", () => ({
    ensureSchoolClassTermsForAcademicYear: mocks.ensureSchoolClassTermsForAcademicYear,
}));
// The selected term is treated as the current academic year in these suites.
vi.mock("@/lib/services/import-term-policy", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/services/import-term-policy")>()),
    checkImportTerm: vi.fn(async (id: string) => ({
        kind: "allowed" as const,
        term: { id, year: 2569, semester: 1 },
    })),
}));
vi.mock("@/lib/cache/redis-idempotency", () => ({
    startIdempotentOperation: mocks.startIdempotentOperation,
    completeIdempotentOperation: mocks.completeIdempotentOperation,
    clearIdempotentOperation: mocks.clearIdempotentOperation,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/lib/actions/analytics/cache", () => ({ revalidateAnalyticsCache: vi.fn() }));

const { importStudents } = await import("@/lib/actions/student/mutations");

interface FakeStudent {
    id: string;
    schoolId: string;
    studentId: string;
    nationalId: string | null;
    firstName: string;
    lastName: string;
    class: string;
    gender: "MALE" | "FEMALE" | null;
    age: number | null;
    phqResults: { academicYear: { startDate: Date } }[];
}

const SCORES: ParsedStudent["scores"] = {
    q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q9a: false, q9b: false,
};
const ACK_MESSAGE = "ต้องยืนยันการนำเข้ารหัสนักเรียนที่เป็นตัวเลขก่อน กรุณาลองใหม่";
let db: FakeStudent[] = [];

function numericRow(studentId: string, overrides: Partial<ParsedStudent> = {}): ParsedStudent {
    return {
        studentId,
        numericStudentId: true,
        nationalId: null,
        firstName: "สมชาย",
        lastName: "ใจดี",
        gender: "MALE",
        age: 13,
        class: "ม.1/1",
        scores: SCORES,
        ...overrides,
    };
}

function textRow(studentId: string, overrides: Partial<ParsedStudent> = {}): ParsedStudent {
    const { numericStudentId: _numeric, ...row } = numericRow(studentId, overrides);
    return row;
}

function stored(studentId: string, overrides: Partial<FakeStudent> = {}): FakeStudent {
    return {
        id: `db-${studentId}`,
        schoolId: "school-1",
        studentId,
        nationalId: null,
        firstName: "สมชาย",
        lastName: "ใจดี",
        class: "ม.1/1",
        gender: "MALE",
        age: 13,
        phqResults: [],
        ...overrides,
    };
}

interface FindManyArgs {
    where: { schoolId?: string; nationalId?: { in: string[] }; studentId?: { in: string[] } };
}

function installFakeDatabase(): void {
    mocks.studentFindMany.mockImplementation(async ({ where }: FindManyArgs) => {
        if (where.nationalId) {
            const ids = where.nationalId.in;
            return db.filter((s) => s.nationalId !== null && ids.includes(s.nationalId));
        }
        const ids = where.studentId?.in ?? [];
        return db.filter((s) => s.schoolId === where.schoolId && ids.includes(s.studentId));
    });
    mocks.queryRaw.mockImplementation(async (_sql: unknown, schoolId: string, keys: { values: string[] }) =>
        db.filter((s) => s.schoolId === schoolId && keys.values.includes(s.studentId.replace(/^0+/, "")))
            .map((s) => ({ studentId: s.studentId })),
    );
    mocks.studentCreateMany.mockImplementation(async ({ data }: { data: { studentId: string }[] }) =>
        data.map((student) => ({ id: `new-${student.studentId}`, studentId: student.studentId })),
    );
    mocks.phqResultCreateMany.mockImplementation(async ({ data }: { data: unknown[] }) => ({ count: data.length }));
    mocks.transaction.mockImplementation(async (callback) => callback({
        $queryRaw: mocks.queryRaw,
        student: {
            findMany: mocks.studentFindMany,
            createManyAndReturn: mocks.studentCreateMany,
            update: mocks.studentUpdate,
        },
        phqResult: { findMany: mocks.phqResultFindMany, createMany: mocks.phqResultCreateMany },
        activityProgress: { createMany: vi.fn() },
        academicYear: { findUnique: vi.fn() },
    }));
}

function signInAs(role: "school_admin" | "class_teacher", advisoryClass = "ม.1/1"): void {
    mocks.requireAuth.mockResolvedValue({ user: { id: "user-1", role } });
    mocks.userFindUnique.mockResolvedValue({
        schoolId: "school-1",
        teacher: role === "class_teacher" ? { advisoryClass } : null,
    });
}

function expectNoWrites(): void {
    expect(mocks.studentCreateMany).not.toHaveBeenCalled();
    expect(mocks.studentUpdate).not.toHaveBeenCalled();
    expect(mocks.phqResultCreateMany).not.toHaveBeenCalled();
}

function phqStudentIds(): string[] {
    const [call] = mocks.phqResultCreateMany.mock.calls;
    return (call?.[0].data as { studentId: string }[]).map((row) => row.studentId);
}

describe("importStudents numeric student code resolution", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        db = [];
        signInAs("school_admin");
        mocks.schoolClassFindMany.mockResolvedValue([{ name: "ม.1/1" }, { name: "ม.1/2" }]);
        mocks.ensureSchoolClassTermsForAcademicYear.mockResolvedValue("ay-1");
        mocks.startIdempotentOperation.mockResolvedValue({ status: "started" });
        mocks.phqResultFindMany.mockResolvedValue([]);
        installFakeDatabase();
    });

    it("uses an exact numeric match like a text code when no zero-prefixed twin exists", async () => {
        db = [stored("123")];

        const result = await importStudents([numericRow("123")], "ay-input", 1);

        expect(result).toMatchObject({ success: true, imported: 1, createdStudents: 0, identityConflicts: 0 });
        expect(phqStudentIds()).toEqual(["db-123"]);
    });

    it("reviews an exact match that also has a zero-prefixed twin and lists both", async () => {
        db = [stored("123"), stored("00123")];

        const result = await importStudents([numericRow("123")], "ay-input", 1, { numericIdAcknowledged: true });

        expect(result).toMatchObject({ success: false, imported: 0, identityConflicts: 1 });
        expect(result.failedStudents?.[0]?.reason).toContain("มากกว่าหนึ่งรายการ (00123, 123)");
        expectNoWrites();
    });

    it("resolves to a single zero-prefixed record when national IDs agree", async () => {
        db = [stored("00123", { nationalId: "1103700000011", firstName: "ชื่อเดิม" })];

        const result = await importStudents(
            [numericRow("123", { nationalId: "1103700000011" })],
            "ay-input",
            1,
        );

        expect(result).toMatchObject({ success: true, imported: 1, createdStudents: 0 });
        expect(result.importedStudents).toEqual([
            expect.objectContaining({ studentId: "00123", sourceStudentId: "123" }),
        ]);
        expect(phqStudentIds()).toEqual(["db-00123"]);
        expect(mocks.studentUpdate).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "db-00123" },
            data: expect.not.objectContaining({ studentId: expect.anything() }),
        }));
    });

    it("resolves on exact names, known equal gender and a known age", async () => {
        db = [stored("00123", { age: 12 })];

        const result = await importStudents([numericRow("123", { firstName: " สมชาย " })], "ay-input", 1);

        expect(result).toMatchObject({ success: true, imported: 1, createdStudents: 0 });
        expect(phqStudentIds()).toEqual(["db-00123"]);
    });

    it.each([
        ["a minor surname typo", stored("00123", { lastName: "ใจดีย" })],
        ["an unknown gender", stored("00123", { gender: null })],
        ["an unknown age", stored("00123", { age: null })],
    ])("reviews instead of creating when the only evidence is %s", async (_label, candidate) => {
        db = [candidate];

        const result = await importStudents([numericRow("123")], "ay-input", 1, { numericIdAcknowledged: true });

        expect(result).toMatchObject({ success: false, identityConflicts: 1 });
        expect(result.failedStudents?.[0]?.reason).toBe(
            "รหัสนักเรียน 123 อาจตรงกับรหัส 00123 ที่มีในระบบ แต่ข้อมูลไม่พอยืนยันว่าเป็นคนเดียวกัน หากเป็นคนเดียวกัน ให้แก้รหัสในไฟล์เป็น 00123 (จัดรูปแบบเซลล์เป็นข้อความ) แล้วนำเข้าใหม่",
        );
        expectNoWrites();
    });

    it("reviews contradicting national IDs without suggesting a code change", async () => {
        db = [stored("00123", { nationalId: "1103700000012" })];

        const result = await importStudents(
            [numericRow("123", { nationalId: "1103700000011" })],
            "ay-input",
            1,
            { numericIdAcknowledged: true },
        );

        expect(result).toMatchObject({ success: false, imported: 0, identityConflicts: 1 });
        expect(result.failedStudents?.[0]?.reason).toBe(
            "เลขบัตรประชาชนของรหัสนักเรียน 123 ไม่ตรงกับนักเรียนรหัส 00123 ในระบบ กรุณาตรวจรหัสนักเรียนและเลขบัตรประชาชนจากทะเบียนก่อนนำเข้า",
        );
        expectNoWrites();
    });

    it("reviews when two zero-prefixed records share the key", async () => {
        db = [stored("0123"), stored("00123")];

        const result = await importStudents([numericRow("123")], "ay-input", 1, { numericIdAcknowledged: true });

        expect(result.failedStudents?.[0]?.reason).toContain("(00123, 0123)");
        expectNoWrites();
    });

    it("reports a conflict when the national ID belongs to another student", async () => {
        db = [stored("00123"), stored("777", { nationalId: "1103700000011" })];

        const result = await importStudents(
            [numericRow("123", { nationalId: "1103700000011" })],
            "ay-input",
            1,
            { numericIdAcknowledged: true },
        );

        expect(result).toMatchObject({ success: false, identityConflicts: 1 });
        expect(result.failedStudents?.[0]?.reason).toContain("เลขประจำตัวซ้ำ");
        expectNoWrites();
    });

    it("rejects a numeric code beside a zero-prefixed text code in the same file", async () => {
        const result = await importStudents(
            [numericRow("123"), textRow("00123", { firstName: "สมหญิง" })],
            "ay-input",
            1,
            { numericIdAcknowledged: true },
        );

        expect(result).toMatchObject({ status: "partial", imported: 1, createdStudents: 1 });
        expect(result.failedStudents).toEqual([
            expect.objectContaining({ studentId: "123", reason: expect.stringContaining("00123 ในไฟล์นี้") }),
        ]);
        expect(mocks.studentCreateMany.mock.calls[0]?.[0].data).toEqual([
            expect.objectContaining({ studentId: "00123" }),
        ]);
    });

    it("keeps text 123 and text 00123 as distinct new students without a zero-key lookup", async () => {
        const result = await importStudents(
            [textRow("123"), textRow("00123", { firstName: "สมหญิง" })],
            "ay-input",
            1,
        );

        expect(result).toMatchObject({ success: true, createdStudents: 2 });
        expect(mocks.queryRaw).not.toHaveBeenCalled();
    });

    it("scopes the zero-key lookup to the importing school", async () => {
        db = [stored("00123", { schoolId: "school-2" })];

        const result = await importStudents([numericRow("123")], "ay-input", 1, { numericIdAcknowledged: true });

        expect(mocks.queryRaw).toHaveBeenCalledWith(expect.anything(), "school-1", expect.anything());
        expect(result).toMatchObject({ success: true, createdStudents: 1 });
        expect(JSON.stringify(result)).not.toContain("00123");
    });

    it("does not let a class teacher reach a resolved student outside their class", async () => {
        signInAs("class_teacher", "ม.1/1");
        db = [stored("00123", { class: "ม.1/2", nationalId: "1103700000011" })];

        const result = await importStudents(
            [numericRow("123", { nationalId: "1103700000011" })],
            "ay-input",
            1,
            { numericIdAcknowledged: true },
        );

        expect(result).toMatchObject({ success: false, imported: 0, skipped: 1 });
        expect(result.failedStudents).toEqual([expect.objectContaining({ reason: "ไม่ใช่ห้องที่คุณดูแล" })]);
        expect(JSON.stringify(result)).not.toContain("00123");
        expectNoWrites();
    });

    it("reports an ambiguity with a candidate in another class as a non-disclosing conflict", async () => {
        signInAs("class_teacher", "ม.1/1");
        db = [stored("0123", { class: "ม.1/2" }), stored("00123")];

        const result = await importStudents([numericRow("123")], "ay-input", 1, { numericIdAcknowledged: true });

        expect(result).toMatchObject({ success: false, imported: 0, identityConflicts: 1, skipped: 0 });
        expect(result.failedStudents).toEqual([expect.objectContaining({ studentId: "123", reason: "รหัสนักเรียน 123 อาจซ้ำกับนักเรียนที่มีในระบบ กรุณาติดต่อผู้ดูแลระบบของโรงเรียนเพื่อตรวจสอบรหัสก่อนนำเข้า" })]);
        expect(JSON.stringify(result)).not.toMatch(/0123|ม\.1\/2/);
        expectNoWrites();
    });
});

describe("importStudents numeric student code acknowledgement", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        db = [];
        signInAs("school_admin");
        mocks.schoolClassFindMany.mockResolvedValue([{ name: "ม.1/1" }]);
        mocks.ensureSchoolClassTermsForAcademicYear.mockResolvedValue("ay-1");
        mocks.startIdempotentOperation.mockResolvedValue({ status: "started" });
        mocks.phqResultFindMany.mockResolvedValue([]);
        installFakeDatabase();
    });

    it("rejects the whole batch before any write when a new numeric student is unacknowledged", async () => {
        db = [stored("123"), stored("00123")];
        const result = await importStudents(
            [numericRow("4501"), textRow("A-1"), textRow("B-1", { class: "ม.9/9" }), numericRow("123")],
            "ay-input",
            1,
        );

        expect(result).toMatchObject({ success: false, status: "error", message: ACK_MESSAGE, imported: 0 });
        expect(result.failedStudents).toEqual(expect.arrayContaining([
            expect.objectContaining({ studentId: "B-1", reason: "ยังไม่มีห้องเรียนดังกล่าวในระบบ" }),
            expect.objectContaining({ studentId: "123", reason: expect.stringContaining("มากกว่าหนึ่งรายการ") }),
        ]));
        expect(result.failedStudents).toHaveLength(2);
        expect(result.errors).toEqual([expect.stringContaining("มากกว่าหนึ่งรายการ")]);
        expectNoWrites();
        expect(mocks.completeIdempotentOperation).not.toHaveBeenCalled();
        expect(mocks.clearIdempotentOperation).toHaveBeenCalledTimes(1);
    });

    it("creates new numeric students with their string codes once acknowledged", async () => {
        const result = await importStudents(
            [numericRow("4501"), textRow("A-1")],
            "ay-input",
            1,
            { numericIdAcknowledged: true },
        );

        expect(result).toMatchObject({ success: true, imported: 2, createdStudents: 2 });
        expect(mocks.studentCreateMany.mock.calls[0]?.[0].data.map((s: { studentId: string }) => s.studentId))
            .toEqual(["4501", "A-1"]);
    });

    it("does not require acknowledgement when every numeric row resolves to an existing student", async () => {
        db = [stored("4501"), stored("00123", { nationalId: "1103700000011" })];

        const result = await importStudents(
            [numericRow("4501"), numericRow("123", { nationalId: "1103700000011", firstName: "สมหญิง" })],
            "ay-input",
            1,
        );

        expect(result).toMatchObject({ success: true, imported: 2, createdStudents: 0 });
    });

    it.each([
        ["a string flag", { numericIdAcknowledged: "true" }],
        ["an unknown key", { numericIdAcknowledged: true, extra: 1 }],
        ["an array", []],
        ["null", null],
    ])("rejects %s as malformed acknowledgement input", async (_label, options) => {
        const result = await importStudents(
            [numericRow("4501")],
            "ay-input",
            1,
            options as unknown as { numericIdAcknowledged?: boolean },
        );

        expect(result).toMatchObject({ success: false, message: "ข้อมูลการยืนยันนำเข้าไม่ถูกต้อง" });
        expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("lets an acknowledged retry import after an unacknowledged rejection", async () => {
        const rows = [numericRow("4501")];

        const rejected = await importStudents(rows, "ay-input", 1);
        const accepted = await importStudents(rows, "ay-input", 1, { numericIdAcknowledged: true });

        expect(rejected).toMatchObject({ success: false, message: ACK_MESSAGE });
        expect(accepted).toMatchObject({ success: true, createdStudents: 1 });
        const [firstKey, secondKey] = mocks.startIdempotentOperation.mock.calls.map(([key]) => key);
        expect(firstKey).not.toBe(secondKey);
        expect(mocks.clearIdempotentOperation).toHaveBeenCalledWith(firstKey);
    });
});
