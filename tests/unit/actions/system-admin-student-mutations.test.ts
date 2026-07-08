import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/actions/system-admin/mutations";
import { updateSystemStudent } from "@/lib/actions/system-admin/mutations";

const prismaMocks = vi.hoisted(() => ({
    transaction: vi.fn(),
    studentFindUnique: vi.fn(),
    schoolClassFindUnique: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        $transaction: prismaMocks.transaction,
        student: { findUnique: prismaMocks.studentFindUnique },
        schoolClass: { findUnique: prismaMocks.schoolClassFindUnique },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: vi.fn(),
}));

vi.mock("@/lib/actions/dashboard/cache", () => ({
    revalidateDashboardCache: vi.fn(),
}));

vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: vi.fn(),
}));

vi.mock("@/lib/actions/system-admin/events", () => ({
    createSystemAdminEditEvent: vi.fn(),
}));

const actor: Actor = {
    id: "admin-1",
    email: "admin@example.com",
    name: "ผู้ดูแลระบบ",
    role: "system_admin",
};

function createInput(className: string) {
    return {
        id: "student-1",
        studentId: "1001",
        nationalId: "1234567890123",
        firstName: "สมชาย",
        lastName: "ใจดี",
        gender: "MALE" as const,
        age: 13,
        class: className,
        status: "ACTIVE" as const,
        reason: "แก้ข้อมูลนำเข้าผิด",
    };
}

function createStudentRow() {
    return {
        id: "student-1",
        studentId: "1001",
        firstName: "สมชาย",
        lastName: "ใจดี",
        nationalId: "1234567890123",
        gender: "MALE" as const,
        age: 13,
        class: "ม.1/1",
        status: "ACTIVE" as const,
        statusChangedAt: new Date("2026-01-01T00:00:00.000Z"),
        disabledAt: null,
        isTestData: false,
        schoolId: "school-1",
        school: {
            name: "โรงเรียนทดสอบ",
            disabledAt: null,
            isTestData: false,
            classes: [{ id: "class-1", name: "ม.1/1" }],
        },
    };
}

describe("updateSystemStudent", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.studentFindUnique.mockResolvedValue(createStudentRow());
    });

    it("rejects a class that was not created for the student's school", async () => {
        prismaMocks.schoolClassFindUnique.mockResolvedValue(null);

        const result = await updateSystemStudent(createInput("ม.9/9"), actor);

        expect(result).toEqual({
            success: false,
            message: "ไม่พบห้องเรียนนี้ในโรงเรียน",
        });
        expect(prismaMocks.schoolClassFindUnique).toHaveBeenCalledWith({
            where: {
                schoolId_name: {
                    schoolId: "school-1",
                    name: "ม.9/9",
                },
            },
            select: { id: true },
        });
        expect(prismaMocks.transaction).not.toHaveBeenCalled();
    });
});
