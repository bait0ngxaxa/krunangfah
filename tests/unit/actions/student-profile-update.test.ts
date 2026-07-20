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
        updateMany: vi.fn(),
    },
    schoolClass: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
    },
    schoolClassTerm: {
        upsert: vi.fn(),
        updateMany: vi.fn(),
    },
    academicYear: { findFirst: vi.fn() },
    phqResult: {
        findFirst: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: prismaMock,
}));

vi.mock("@/lib/auth/session", () => ({
    requireAuth: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    updateTag: vi.fn(),
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: vi.fn(),
}));

vi.mock("@/lib/services/school-class-term-service", () => ({
    ensureSchoolClassTermsForAcademicYear: vi.fn(),
}));

vi.mock("@/lib/cache/redis-idempotency", () => ({
    clearIdempotentOperation: vi.fn(),
    completeIdempotentOperation: vi.fn(),
    startIdempotentOperation: vi.fn(),
}));

vi.mock("@/lib/utils/logging", () => ({
    logError: vi.fn(),
}));

import { requireAuth } from "@/lib/auth/session";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
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

function updatedStudentProfile(overrides: Record<string, unknown> = {}) {
    return {
        id: "student-1",
        studentId: "ST-001",
        nationalId: "1103700000011",
        firstName: "สมหญิง",
        lastName: "ใจดี",
        gender: null,
        age: 13,
        class: "ม.1/1",
        status: "ACTIVE",
        ...overrides,
    };
}

function latestProfileContext(overrides: Record<string, unknown> = {}) {
    return {
        activePhqResultId: "phq-latest",
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
        prismaMock.student.findUnique.mockResolvedValueOnce({
            id: "student-1",
            class: "ม.1/1",
            schoolId: "school-1",
            status: "ACTIVE",
            statusChangedAt: null,
            leftAt: null,
            disabledAt: null,
            updatedAt: new Date("2026-07-15T00:00:00.000Z"),
        }).mockResolvedValue(updatedStudentProfile());
        prismaMock.student.updateMany.mockResolvedValue({ count: 1 });
        prismaMock.phqResult.findFirst.mockResolvedValue({ id: "phq-latest" });
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
        expect(prismaMock.student.updateMany).not.toHaveBeenCalled();
    });

    it("blocks profile class changes for every editable role", async () => {
        const result = await updateStudentProfile(
            "student-1",
            validInput({ class: "ม.1/2" }),
            latestProfileContext(),
        );

        expect(result.success).toBe(false);
        expect(result.message).toBe(
            "ห้องเรียนแก้ไขได้จากการนำเข้าข้อมูลเท่านั้น",
        );
        expect(prismaMock.schoolClass.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.student.updateMany).not.toHaveBeenCalled();
    });

    it("blocks stale profile updates from historical filters", async () => {
        const result = await updateStudentProfile(
            "student-1",
            validInput({ firstName: "สมหญิง" }),
            latestProfileContext({ activePhqResultId: "phq-old" }),
        );

        expect(result.success).toBe(false);
        expect(result.message).toBe(
            "กำลังดูข้อมูลย้อนหลัง กรุณากลับไปที่ปีการศึกษาล่าสุดก่อนแก้ไขข้อมูลนักเรียน",
        );
        expect(prismaMock.student.updateMany).not.toHaveBeenCalled();
    });

    it("updates only the student record for valid profile data", async () => {
        const result = await updateStudentProfile(
            "student-1",
            validInput({ firstName: "สมหญิง", gender: null }),
            latestProfileContext(),
        );

        expect(result.success).toBe(true);
        expect(prismaMock.student.updateMany).toHaveBeenCalledWith({
            where: {
                id: "student-1",
                updatedAt: new Date("2026-07-15T00:00:00.000Z"),
            },
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
        expect(result.student).toEqual(updatedStudentProfile());
        expect(prismaMock.phqResult.update).not.toHaveBeenCalled();
        expect(revalidateStudentsCache).toHaveBeenCalledWith(
            "school-1",
            "student-1",
        );
    });
});
