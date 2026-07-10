import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateMySchoolInfo } from "@/lib/actions/school-info.actions";

const mocks = vi.hoisted(() => ({
    checkRateLimit: vi.fn(),
    requirePrimaryAdmin: vi.fn(),
    schoolUpdate: vi.fn(),
    revalidateDashboardCache: vi.fn(),
    revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
    headers: async () => ({ get: () => "127.0.0.1" }),
}));

vi.mock("next/cache", () => ({
    revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/rate-limit", () => ({
    createRateLimiter: () => ({ check: mocks.checkRateLimit }),
    extractRateLimitKey: () => "127.0.0.1",
    TRUSTED_PROXY_HEADERS: { trustProxyHeaders: true },
}));

vi.mock("@/lib/auth/session", () => ({
    requirePrimaryAdmin: mocks.requirePrimaryAdmin,
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        school: {
            update: mocks.schoolUpdate,
        },
    },
}));

vi.mock("@/lib/actions/dashboard/cache", () => ({
    revalidateDashboardCache: mocks.revalidateDashboardCache,
}));

describe("updateMySchoolInfo", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.checkRateLimit.mockResolvedValue({
            allowed: true,
            limit: 30,
            remaining: 29,
            resetAt: 0,
            retryAfterSeconds: 0,
        });
        mocks.requirePrimaryAdmin.mockResolvedValue({
            user: {
                id: "primary-admin-1",
                role: "school_admin",
                isPrimary: true,
                schoolId: "school-1",
            },
        });
        mocks.schoolUpdate.mockResolvedValue({
            id: "school-1",
            name: "โรงเรียนบ้านทดสอบ",
            province: "เชียงใหม่",
        });
    });

    it("ให้ Primary School Admin แก้ไขเฉพาะโรงเรียนของตัวเองได้", async () => {
        const result = await updateMySchoolInfo({
            name: " รร. บ้านทดสอบ ",
            province: " เชียงใหม่ ",
        });

        expect(result).toEqual({
            success: true,
            message: "บันทึกข้อมูลโรงเรียนสำเร็จ",
            data: {
                id: "school-1",
                name: "โรงเรียนบ้านทดสอบ",
                province: "เชียงใหม่",
            },
        });
        expect(mocks.schoolUpdate).toHaveBeenCalledWith({
            where: { id: "school-1" },
            data: {
                name: "โรงเรียนบ้านทดสอบ",
                province: "เชียงใหม่",
            },
            select: { id: true, name: true, province: true },
        });
    });

    it("ไม่เขียนฐานข้อมูลเมื่อข้อมูลไม่ผ่าน validation", async () => {
        const result = await updateMySchoolInfo({ name: "   ", province: "" });

        expect(result.success).toBe(false);
        expect(result.message).toBe("กรุณากรอกชื่อโรงเรียน");
        expect(mocks.requirePrimaryAdmin).not.toHaveBeenCalled();
        expect(mocks.schoolUpdate).not.toHaveBeenCalled();
    });

    it("ไม่เขียนฐานข้อมูลเมื่อผู้ใช้ไม่มีโรงเรียน", async () => {
        mocks.requirePrimaryAdmin.mockResolvedValue({
            user: {
                id: "primary-admin-1",
                role: "school_admin",
                isPrimary: true,
                schoolId: null,
            },
        });

        const result = await updateMySchoolInfo({
            name: "โรงเรียนบ้านทดสอบ",
            province: "เชียงใหม่",
        });

        expect(result).toEqual({
            success: false,
            message: "ไม่พบข้อมูลโรงเรียนของคุณ",
        });
        expect(mocks.schoolUpdate).not.toHaveBeenCalled();
    });
});
