import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
    $transaction: vi.fn(),
    user: {
        findUnique: vi.fn(),
    },
    student: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    schoolClass: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    schoolClassTerm: {
        upsert: vi.fn(),
    },
    phqResult: {
        update: vi.fn(),
    },
}));

vi.mock("@/lib/prisma", () => ({
    prisma: prismaMock,
}));

vi.mock("@/lib/session", () => ({
    requireAuth: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

vi.mock("@/lib/actions/school-setup.actions", () => ({
    ensureSchoolClassTermsForAcademicYear: vi.fn(),
}));

vi.mock("@/lib/redis-idempotency", () => ({
    clearIdempotentOperation: vi.fn(),
    completeIdempotentOperation: vi.fn(),
    startIdempotentOperation: vi.fn(),
}));

vi.mock("@/lib/utils/logging", () => ({
    logError: vi.fn(),
}));

import { requireAuth } from "@/lib/session";
import { updateStudentProfile } from "@/lib/actions/student/mutations";

function validInput(overrides: Record<string, unknown> = {}) {
    return {
        studentId: "ST-001",
        nationalId: "1103700000011",
        firstName: "สมชาย",
        lastName: "ใจดี",
        gender: "MALE",
        age: 13,
        class: "ม.1/1",
        status: "ACTIVE",
        ...overrides,
    };
}

describe("updateStudentProfile", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(requireAuth).mockResolvedValue({
            user: {
                id: "user-1",
                role: "school_admin",
            },
        } as Awaited<ReturnType<typeof requireAuth>>);
        prismaMock.user.findUnique.mockResolvedValue({
            schoolId: "school-1",
            teacher: null,
        });
        prismaMock.student.findFirst.mockResolvedValue({
            id: "student-1",
            studentId: "ST-001",
            nationalId: "1103700000011",
            class: "ม.1/1",
            schoolId: "school-1",
            status: "ACTIVE",
        });
        prismaMock.student.findUnique.mockResolvedValue(null);
        prismaMock.student.update.mockResolvedValue({});
        prismaMock.schoolClass.findUnique.mockResolvedValue({ id: "class-2" });
        prismaMock.$transaction.mockImplementation(async (callback) =>
            callback(prismaMock),
        );
    });

    it("keeps system admin read-only", async () => {
        vi.mocked(requireAuth).mockResolvedValue({
            user: {
                id: "system-1",
                role: "system_admin",
            },
        } as Awaited<ReturnType<typeof requireAuth>>);

        const result = await updateStudentProfile("student-1", validInput());

        expect(result.success).toBe(false);
        expect(prismaMock.student.update).not.toHaveBeenCalled();
    });

    it("blocks class_teacher from moving a student to another class", async () => {
        vi.mocked(requireAuth).mockResolvedValue({
            user: {
                id: "teacher-1",
                role: "class_teacher",
            },
        } as Awaited<ReturnType<typeof requireAuth>>);
        prismaMock.user.findUnique.mockResolvedValue({
            schoolId: "school-1",
            teacher: { advisoryClass: "ม.1/1" },
        });

        const result = await updateStudentProfile(
            "student-1",
            validInput({ class: "ม.1/2" }),
        );

        expect(result.success).toBe(false);
        expect(result.message).toBe("ครูประจำชั้นไม่สามารถย้ายห้องนักเรียนได้");
        expect(prismaMock.student.update).not.toHaveBeenCalled();
    });

    it("updates only the student record for valid profile data", async () => {
        const result = await updateStudentProfile(
            "student-1",
            validInput({ firstName: "สมหญิง", gender: null }),
        );

        expect(result.success).toBe(true);
        expect(prismaMock.student.update).toHaveBeenCalledWith({
            where: { id: "student-1" },
            data: {
                studentId: "ST-001",
                nationalId: "1103700000011",
                firstName: "สมหญิง",
                lastName: "ใจดี",
                gender: null,
                age: 13,
                class: "ม.1/1",
                status: "ACTIVE",
            },
        });
        expect(prismaMock.phqResult.update).not.toHaveBeenCalled();
    });
});
