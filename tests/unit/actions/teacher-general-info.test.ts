import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateMyTeacherGeneralInfo } from "@/lib/actions/teacher-general-info.actions";

const mocks = vi.hoisted(() => ({
    checkRateLimit: vi.fn(),
    requireAuth: vi.fn(),
    teacherFindUnique: vi.fn(),
    transaction: vi.fn(),
    userUpdate: vi.fn(),
    teacherUpdate: vi.fn(),
    revalidateDashboardCache: vi.fn(),
    revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
    headers: async () => ({ get: () => "127.0.0.1" }),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

vi.mock("@/lib/rate-limit", () => ({
    createRateLimiter: () => ({ check: mocks.checkRateLimit }),
    extractRateLimitKey: () => "127.0.0.1",
    TRUSTED_PROXY_HEADERS: { trustProxyHeaders: true },
}));

vi.mock("@/lib/auth/session", () => ({ requireAuth: mocks.requireAuth }));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        teacher: { findUnique: mocks.teacherFindUnique },
        $transaction: mocks.transaction,
    },
}));

vi.mock("@/lib/actions/dashboard/cache", () => ({
    revalidateDashboardCache: mocks.revalidateDashboardCache,
}));

describe("updateMyTeacherGeneralInfo", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.checkRateLimit.mockResolvedValue({
            allowed: true,
            limit: 30,
            remaining: 29,
            resetAt: 0,
            retryAfterSeconds: 0,
        });
        mocks.requireAuth.mockResolvedValue({ user: { id: "teacher-user-1" } });
        mocks.teacherFindUnique.mockResolvedValue({ id: "teacher-1" });
        mocks.transaction.mockImplementation(async (callback) =>
            callback({
                user: { update: mocks.userUpdate },
                teacher: {
                    update: mocks.teacherUpdate.mockResolvedValue({
                        firstName: "สมชาย",
                        lastName: "ใจดี",
                        age: 35,
                        schoolRole: "ครูประจำชั้น",
                        projectRole: "care",
                    }),
                },
            }),
        );
    });

    it("ให้ครูแก้ไขเฉพาะข้อมูลทั่วไปของตนเองได้", async () => {
        const result = await updateMyTeacherGeneralInfo({
            firstName: "สมชาย",
            lastName: "ใจดี",
            age: 35,
            schoolRole: "ครูประจำชั้น",
            projectRole: "care",
        });

        expect(result).toEqual({
            success: true,
            message: "บันทึกข้อมูลทั่วไปสำเร็จ",
            data: {
                firstName: "สมชาย",
                lastName: "ใจดี",
                age: 35,
                schoolRole: "ครูประจำชั้น",
                projectRole: "care",
            },
        });
        expect(mocks.transaction).toHaveBeenCalledOnce();
        expect(mocks.userUpdate).toHaveBeenCalledWith({
            where: { id: "teacher-user-1" },
            data: { name: "สมชาย ใจดี" },
        });
        expect(mocks.teacherUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: "teacher-user-1" },
                data: {
                    firstName: "สมชาย",
                    lastName: "ใจดี",
                    age: 35,
                    schoolRole: "ครูประจำชั้น",
                    projectRole: "care",
                },
            }),
        );
    });

    it("ไม่เขียนฐานข้อมูลเมื่อข้อมูลไม่ผ่าน validation", async () => {
        const result = await updateMyTeacherGeneralInfo({
            firstName: "",
            lastName: "ใจดี",
            age: 35,
            schoolRole: "ครูประจำชั้น",
            projectRole: "care",
        });

        expect(result.success).toBe(false);
        expect(result.message).toBe("กรุณากรอกชื่อ");
        expect(mocks.requireAuth).not.toHaveBeenCalled();
        expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("ไม่เขียนฐานข้อมูลเมื่อบัญชีไม่มีโปรไฟล์ครู", async () => {
        mocks.teacherFindUnique.mockResolvedValue(null);

        const result = await updateMyTeacherGeneralInfo({
            firstName: "สมชาย",
            lastName: "ใจดี",
            age: 35,
            schoolRole: "ครูประจำชั้น",
            projectRole: "care",
        });

        expect(result).toEqual({ success: false, message: "ไม่พบโปรไฟล์ครูของคุณ" });
        expect(mocks.transaction).not.toHaveBeenCalled();
    });
});
