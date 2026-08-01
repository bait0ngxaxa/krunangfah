import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";

const mocks = vi.hoisted(() => ({
    teacherFindUnique: vi.fn(),
    logError: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        teacher: { findUnique: mocks.teacherFindUnique },
    },
}));

vi.mock("@/lib/auth/session", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/utils/logging", () => ({ logError: mocks.logError }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/actions/dashboard/cache", () => ({
    revalidateDashboardCache: vi.fn(),
}));

const { getCurrentTeacherProfile, getTeacherProfile } = await import(
    "@/lib/actions/teacher.actions"
);

function mockSession(
    role: "system_admin" | "school_admin" | "class_teacher" =
        "school_admin",
    id = "user-1",
): void {
    vi.mocked(requireAuth).mockResolvedValue({
        user: {
            id,
            role,
            isPrimary: role === "school_admin",
            schoolId: role === "system_admin" ? null : "school-1",
        },
    } as never);
}

const teacherProfile = {
    id: "teacher-1",
    userId: "user-1",
    firstName: "สมชาย",
    lastName: "ใจดี",
    age: 35,
    advisoryClass: "ม.1/1",
    schoolRole: "ครู",
    projectRole: "care",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("teacher profile query results", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSession();
    });

    it("returns success with the teacher profile", async () => {
        vi.mocked(prisma.teacher.findUnique).mockResolvedValue(
            teacherProfile as never,
        );

        const result = await getTeacherProfile("user-1");

        expect(result).toEqual({ status: "success", data: teacherProfile });
    });

    it("returns not_found when Prisma successfully finds no profile", async () => {
        vi.mocked(prisma.teacher.findUnique).mockResolvedValue(null);

        const result = await getTeacherProfile("user-1");

        expect(result.status).toBe("not_found");
        expect(result.status).not.toBe("transient_error");
    });

    it("returns transient_error with a request ID when Prisma rejects", async () => {
        vi.mocked(prisma.teacher.findUnique).mockRejectedValue(
            new Error("Prisma connection failed"),
        );

        const result = await getTeacherProfile("user-1");

        expect(result.status).toBe("transient_error");
        if (result.status !== "transient_error") {
            throw new Error("Expected transient_error");
        }
        expect(result.requestId).toEqual(expect.any(String));
        expect(result).not.toHaveProperty("data");
    });

    it("returns forbidden before querying another user's profile", async () => {
        mockSession("class_teacher", "user-1");

        const result = await getTeacherProfile("user-2");

        expect(result.status).toBe("forbidden");
        expect(prisma.teacher.findUnique).not.toHaveBeenCalled();
    });

    it("returns the current profile role and advisory class on success", async () => {
        vi.mocked(prisma.teacher.findUnique).mockResolvedValue({
            advisoryClass: "ม.2/3",
            user: { role: "class_teacher" },
        } as never);

        const result = await getCurrentTeacherProfile();

        expect(result).toEqual({
            status: "success",
            data: {
                advisoryClass: "ม.2/3",
                user: { role: "class_teacher" },
            },
        });
    });

    it("does not turn a current-profile query failure into null", async () => {
        vi.mocked(prisma.teacher.findUnique).mockRejectedValue(
            new Error("database timeout"),
        );

        const result = await getCurrentTeacherProfile();

        expect(result.status).toBe("transient_error");
        expect(result).not.toBeNull();
    });
});
