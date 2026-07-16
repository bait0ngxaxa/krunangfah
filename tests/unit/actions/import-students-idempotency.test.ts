import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedStudent } from "@/lib/utils/excel-parser";

const mocks = vi.hoisted(() => ({
    requireAuth: vi.fn(),
    userFindUnique: vi.fn(),
    schoolClassFindMany: vi.fn(),
    transaction: vi.fn(),
    ensureSchoolClassTermsForAcademicYear: vi.fn(),
    startIdempotentOperation: vi.fn(),
    completeIdempotentOperation: vi.fn(),
    clearIdempotentOperation: vi.fn(),
    studentFindMany: vi.fn(),
    studentCreateMany: vi.fn(),
    studentUpdate: vi.fn(),
    phqResultFindMany: vi.fn(),
    phqResultCreateMany: vi.fn(),
    activityProgressCreateMany: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
    requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        user: {
            findUnique: mocks.userFindUnique,
        },
        schoolClass: {
            findMany: mocks.schoolClassFindMany,
        },
        phqResult: {
            count: vi.fn(),
        },
        $transaction: mocks.transaction,
    },
}));

vi.mock("@/lib/actions/school-setup.actions", () => ({
    ensureSchoolClassTermsForAcademicYear:
        mocks.ensureSchoolClassTermsForAcademicYear,
}));

vi.mock("@/lib/cache/redis-idempotency", () => ({
    startIdempotentOperation: mocks.startIdempotentOperation,
    completeIdempotentOperation: mocks.completeIdempotentOperation,
    clearIdempotentOperation: mocks.clearIdempotentOperation,
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    updateTag: vi.fn(),
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

const { importStudents } = await import("@/lib/actions/student/mutations");

function createParsedStudent(): ParsedStudent {
    return {
        studentId: "1001",
        nationalId: "1234567890123",
        firstName: "สมชาย",
        lastName: "ใจดี",
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

describe("importStudents idempotency", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireAuth.mockResolvedValue({
            user: {
                id: "user-1",
                role: "school_admin",
            },
        });
        mocks.userFindUnique.mockResolvedValue({
            schoolId: "school-1",
            teacher: null,
        });
        mocks.ensureSchoolClassTermsForAcademicYear.mockResolvedValue("ay-1");
        mocks.startIdempotentOperation.mockResolvedValue({ status: "started" });
        mocks.completeIdempotentOperation.mockResolvedValue(undefined);
        mocks.clearIdempotentOperation.mockResolvedValue(undefined);
    });

    it("returns a processing response when the same import is already running", async () => {
        mocks.startIdempotentOperation.mockResolvedValue({ status: "processing" });

        const result = await importStudents([createParsedStudent()], "ay-input", 1);

        expect(result).toEqual({
            success: false,
            status: "error",
            message: "ไฟล์นี้กำลังนำเข้าอยู่ กรุณารอสักครู่แล้วลองใหม่",
        });
        expect(mocks.schoolClassFindMany).not.toHaveBeenCalled();
        expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("returns cached successful completed results without running the import again", async () => {
        const cachedResult = {
            success: true,
            status: "success" as const,
            message: "นำเข้าสำเร็จทั้งหมด 1 คน",
            imported: 1,
            skipped: 0,
        };
        mocks.startIdempotentOperation.mockResolvedValue({
            status: "completed",
            result: cachedResult,
        });

        const result = await importStudents([createParsedStudent()], "ay-input", 1);

        expect(result).toEqual(cachedResult);
        expect(mocks.schoolClassFindMany).not.toHaveBeenCalled();
        expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("clears cached failed completed results and reruns the import", async () => {
        const cachedResult = {
            success: false,
            status: "error" as const,
            message: "ไม่สามารถนำเข้าได้ทั้งหมด 1 คน (ข้อมูลซ้ำหรือไม่ผ่านเงื่อนไข)",
            imported: 0,
            skipped: 0,
            errors: ["สมชาย ใจดี (1001): มีข้อมูลการประเมินครั้งที่ 1 อยู่แล้ว"],
        };
        mocks.startIdempotentOperation.mockResolvedValue({
            status: "completed",
            result: cachedResult,
        });
        mocks.schoolClassFindMany.mockResolvedValue([{ name: "ม.1/1" }]);
        mocks.transaction.mockResolvedValue({
            importedCount: 1,
            duplicateRoundErrors: [],
            duplicateRoundFailures: [],
            importedStudents: [],
        });

        const result = await importStudents([createParsedStudent()], "ay-input", 1);

        expect(result.success).toBe(true);
        expect(mocks.clearIdempotentOperation).toHaveBeenCalledWith(
            expect.stringMatching(/^idem:import-students:user-1:school-1:ay-1:1:/),
        );
        expect(mocks.schoolClassFindMany).toHaveBeenCalled();
        expect(mocks.transaction).toHaveBeenCalled();
    });

    it("clears early validation results after starting idempotency", async () => {
        mocks.requireAuth.mockResolvedValue({
            user: {
                id: "user-1",
                role: "class_teacher",
            },
        });
        mocks.userFindUnique.mockResolvedValue({
            schoolId: "school-1",
            teacher: null,
        });
        mocks.schoolClassFindMany.mockResolvedValue([{ name: "ม.1/1" }]);

        const result = await importStudents([createParsedStudent()], "ay-input", 1);

        expect(result).toEqual({
            success: false,
            status: "error",
            message: "ไม่พบข้อมูลห้องที่คุณดูแล กรุณาตั้งค่าโปรไฟล์ก่อน",
        });
        expect(mocks.clearIdempotentOperation).toHaveBeenCalledWith(
            expect.stringMatching(/^idem:import-students:user-1:school-1:ay-1:1:/),
        );
        expect(mocks.completeIdempotentOperation).not.toHaveBeenCalled();
        expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("clears duplicate PHQ import errors instead of caching them", async () => {
        mocks.schoolClassFindMany.mockResolvedValue([{ name: "ม.1/1" }]);
        mocks.transaction.mockResolvedValue({
            importedCount: 0,
            duplicateRoundErrors: [
                "สมชาย ใจดี (1001): มีข้อมูลการประเมินครั้งที่ 1 อยู่แล้ว",
            ],
            duplicateRoundFailures: [],
            importedStudents: [],
        });

        const result = await importStudents([createParsedStudent()], "ay-input", 1);

        expect(result.success).toBe(false);
        expect(result.errors).toContain(
            "สมชาย ใจดี (1001): มีข้อมูลการประเมินครั้งที่ 1 อยู่แล้ว",
        );
        expect(mocks.clearIdempotentOperation).toHaveBeenCalledWith(
            expect.stringMatching(/^idem:import-students:user-1:school-1:ay-1:1:/),
        );
        expect(mocks.completeIdempotentOperation).not.toHaveBeenCalled();
    });

    it("does not update an existing student when the PHQ round is duplicated", async () => {
        const existingStudent = {
            id: "student-db-1",
            schoolId: "school-1",
            studentId: "1001",
            nationalId: "1234567890123",
            firstName: "สมชาย",
            lastName: "ใจดี",
            gender: "FEMALE",
            age: 12,
            class: "ม.1/1",
        };
        mocks.schoolClassFindMany.mockResolvedValue([{ name: "ม.1/1" }]);
        mocks.studentFindMany
            .mockResolvedValueOnce([existingStudent])
            .mockResolvedValueOnce([existingStudent])
            .mockResolvedValueOnce([existingStudent]);
        mocks.phqResultFindMany.mockResolvedValueOnce([
            { studentId: existingStudent.id },
        ]);
        mocks.transaction.mockImplementation(async (callback) =>
            callback({
                student: {
                    findMany: mocks.studentFindMany,
                    createMany: mocks.studentCreateMany,
                    update: mocks.studentUpdate,
                },
                phqResult: {
                    findMany: mocks.phqResultFindMany,
                    createMany: mocks.phqResultCreateMany,
                },
                activityProgress: {
                    createMany: mocks.activityProgressCreateMany,
                },
            }),
        );

        const result = await importStudents([createParsedStudent()], "ay-input", 1);

        expect(result.success).toBe(false);
        expect(result.errors).toContain(
            "สมชาย ใจดี (1001): มีข้อมูลการประเมินครั้งที่ 1 อยู่แล้ว",
        );
        expect(result).toMatchObject({
            createdStudents: 0,
            updatedStudents: 0,
            phqCreated: 0,
            duplicateRoundsSkipped: 1,
            identityConflicts: 0,
        });
        expect(mocks.studentCreateMany).not.toHaveBeenCalled();
        expect(mocks.studentUpdate).not.toHaveBeenCalled();
        expect(mocks.phqResultCreateMany).not.toHaveBeenCalled();
    });
});
