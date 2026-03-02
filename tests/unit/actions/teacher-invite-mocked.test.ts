import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createTeacherInvite,
    acceptTeacherInvite,
    revokeTeacherInvite,
} from "@/lib/actions/teacher-invite/mutations";
import {
    getTeacherInvite,
    getMyTeacherInvites,
} from "@/lib/actions/teacher-invite/queries";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { hashPassword } from "@/lib/user";
import { revalidatePath } from "next/cache";
import type { TeacherInviteFormData } from "@/lib/validations/teacher-invite.validation";

// Mock external dependencies
vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        teacherInvite: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        teacher: {
            create: vi.fn(),
        },
        schoolTeacherRoster: {
            findFirst: vi.fn(),
            update: vi.fn(),
        },
        $transaction: vi.fn(async (callback) => {
            // Provide a mock transaction client that mirrors the prisma mock
            const tx = {
                user: {
                    create: vi.fn().mockResolvedValue({ id: "new-user-id" }),
                },
                teacher: { create: vi.fn() },
                teacherInvite: { update: vi.fn() },
            };
            await callback(tx);
            return true;
        }),
    },
}));

vi.mock("@/lib/session", () => ({
    requireAuth: vi.fn(),
}));

vi.mock("@/lib/user", () => ({
    hashPassword: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

// Provide some valid base input
const baseInput: TeacherInviteFormData = {
    email: "test@example.com",
    firstName: "สมชาย",
    lastName: "ใจดี",
    age: "30",
    userRole: "class_teacher",
    advisoryClass: "ม.1/1",
    academicYearId: "ay-1",
    schoolRole: "ครูประจำคลาส",
    projectRole: "lead",
};

describe("Mocked Teacher Invite Actions (Coverage Run)", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe("createTeacherInvite", () => {
        it("fails if user is class_teacher (unauthorized)", async () => {
            vi.mocked(requireAuth).mockResolvedValue({
                user: { id: "u1", role: "class_teacher", schoolId: "s1" },
            } as any);

            const res = await createTeacherInvite(baseInput);

            expect(res.success).toBe(false);
            expect(res.message).toBe("ไม่มีสิทธิ์สร้างคำเชิญ");
        });

        it("fails if user has no schoolId", async () => {
            vi.mocked(requireAuth).mockResolvedValue({
                user: { id: "u1", role: "school_admin" },
            } as any);
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                schoolId: null,
            } as any);

            const res = await createTeacherInvite(baseInput);

            expect(res.success).toBe(false);
            expect(res.message).toBe("คุณยังไม่ได้เชื่อมต่อกับโรงเรียน");
        });

        it("fails if email already exists as a user", async () => {
            vi.mocked(requireAuth).mockResolvedValue({
                user: { id: "u1", role: "school_admin" },
            } as any);
            vi.mocked(prisma.user.findUnique)
                .mockResolvedValueOnce({ schoolId: "s1" } as any) // for user
                .mockResolvedValueOnce({ id: "exist", email: "x" } as any); // for existingUser

            const res = await createTeacherInvite(baseInput);

            expect(res.success).toBe(false);
            expect(res.message).toBe("อีเมลนี้มีผู้ใช้งานแล้ว");
        });

        it("fails if pending invite already exists", async () => {
            vi.mocked(requireAuth).mockResolvedValue({
                user: { id: "u1", role: "school_admin" },
            } as any);
            vi.mocked(prisma.user.findUnique)
                .mockResolvedValueOnce({ schoolId: "s1" } as any)
                .mockResolvedValueOnce(null as any);
            vi.mocked(prisma.teacherInvite.findFirst).mockResolvedValue({
                id: "pending-inv",
            } as any);

            const res = await createTeacherInvite(baseInput);

            expect(res.success).toBe(false);
            expect(res.message).toBe(
                "มีคำเชิญที่รอดำเนินการสำหรับอีเมลนี้แล้ว",
            );
        });

        it("succeeds if everything is valid", async () => {
            vi.mocked(requireAuth).mockResolvedValue({
                user: { id: "u1", role: "school_admin" },
            } as any);
            vi.mocked(prisma.user.findUnique)
                .mockResolvedValueOnce({ schoolId: "s1" } as any)
                .mockResolvedValueOnce(null as any);
            vi.mocked(prisma.teacherInvite.findFirst).mockResolvedValue(
                null as any,
            );
            vi.mocked(prisma.teacherInvite.create).mockResolvedValue({
                id: "new-invite",
                token: "random-token",
            } as any);

            const res = await createTeacherInvite(baseInput);

            expect(res.success).toBe(true);
            expect(res.message).toBe("สร้างคำเชิญสำเร็จ");
            expect(revalidatePath).toHaveBeenCalledWith("/teachers/add");
        });

        it("catches errors and returns false", async () => {
            vi.mocked(requireAuth).mockRejectedValue(new Error("DB Down"));
            const res = await createTeacherInvite(baseInput);
            expect(res.success).toBe(false);
            expect(res.message).toBe("เกิดข้อผิดพลาดในการสร้างคำเชิญ");
        });
    });

    describe("acceptTeacherInvite", () => {
        it("fails if invite not found", async () => {
            vi.mocked(prisma.teacherInvite.findUnique).mockResolvedValue(
                null as any,
            );
            const res = await acceptTeacherInvite("token", "pass");
            expect(res.success).toBe(false);
            expect(res.message).toBe("ไม่พบคำเชิญ");
        });

        it("fails if already accepted", async () => {
            vi.mocked(prisma.teacherInvite.findUnique).mockResolvedValue({
                acceptedAt: new Date(),
            } as any);
            const res = await acceptTeacherInvite("token", "pass");
            expect(res.success).toBe(false);
            expect(res.message).toBe("คำเชิญนี้ถูกใช้งานแล้ว");
        });

        it("fails if expired", async () => {
            vi.mocked(prisma.teacherInvite.findUnique).mockResolvedValue({
                acceptedAt: null,
                expiresAt: new Date(Date.now() - 10000), // past
            } as any);
            const res = await acceptTeacherInvite("token", "pass");
            expect(res.success).toBe(false);
            expect(res.message).toBe("คำเชิญหมดอายุแล้ว");
        });

        it("succeeds for valid invite", async () => {
            vi.mocked(prisma.teacherInvite.findUnique).mockResolvedValue({
                id: "inv-1",
                email: "x@x.com",
                firstName: "A",
                lastName: "B",
                userRole: "class_teacher",
                schoolId: "s1",
                acceptedAt: null,
                expiresAt: new Date(Date.now() + 10000), // future
            } as any);
            vi.mocked(hashPassword).mockResolvedValue("hashed");
            vi.mocked(prisma.$transaction).mockResolvedValue(true);

            const res = await acceptTeacherInvite("token", "pass");
            expect(res.success).toBe(true);
            expect(res.message).toBe("ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ");
        });

        it("catches errors and returns false", async () => {
            vi.mocked(prisma.teacherInvite.findUnique).mockRejectedValue(
                new Error("DB error"),
            );
            const res = await acceptTeacherInvite("tok", "pass");
            expect(res.success).toBe(false);
            expect(res.message).toBe("เกิดข้อผิดพลาดในการลงทะเบียน");
        });
    });

    describe("revokeTeacherInvite", () => {
        it("fails if invite not found", async () => {
            vi.mocked(requireAuth).mockResolvedValue({ user: {} } as any);
            vi.mocked(prisma.teacherInvite.findUnique).mockResolvedValue(
                null as any,
            );
            const res = await revokeTeacherInvite("inv-id");
            expect(res.success).toBe(false);
        });

        it("fails if already accepted", async () => {
            vi.mocked(requireAuth).mockResolvedValue({ user: {} } as any);
            vi.mocked(prisma.teacherInvite.findUnique).mockResolvedValue({
                acceptedAt: new Date(),
            } as any);
            const res = await revokeTeacherInvite("inv-id");
            expect(res.success).toBe(false);
        });

        it("fails if unauthorized (unrelated school_admin)", async () => {
            vi.mocked(requireAuth).mockResolvedValue({
                user: { role: "school_admin", isPrimary: true, schoolId: "s1" },
            } as any);
            vi.mocked(prisma.teacherInvite.findUnique).mockResolvedValue({
                acceptedAt: null,
                schoolId: "s2", // different school
            } as any);
            const res = await revokeTeacherInvite("inv-id");
            expect(res.success).toBe(false);
            expect(res.message).toBe("ไม่มีสิทธิ์ยกเลิกคำเชิญ");
        });

        it("succeeds and resets roster match if found", async () => {
            vi.mocked(requireAuth).mockResolvedValue({
                user: { role: "system_admin" },
            } as any);
            vi.mocked(prisma.teacherInvite.findUnique).mockResolvedValue({
                id: "inv-id",
                acceptedAt: null,
                schoolId: "s1",
                email: "x@x.com",
            } as any);
            vi.mocked(prisma.teacherInvite.delete).mockResolvedValue(
                true as any,
            );
            vi.mocked(prisma.schoolTeacherRoster.findFirst).mockResolvedValue({
                id: "roster-id",
            } as any);

            const res = await revokeTeacherInvite("inv-id");

            expect(res.success).toBe(true);
            expect(prisma.schoolTeacherRoster.update).toHaveBeenCalledWith({
                where: { id: "roster-id" },
                data: { inviteSent: false },
            });
            expect(revalidatePath).toHaveBeenCalledWith("/teachers/add");
        });

        it("catches errors", async () => {
            vi.mocked(requireAuth).mockRejectedValue(new Error("Err"));
            const res = await revokeTeacherInvite("inv-id");
            expect(res.success).toBe(false);
        });
    });

    describe("getTeacherInvite", () => {
        it("returns fail if not found", async () => {
            vi.mocked(prisma.teacherInvite.findUnique).mockResolvedValue(
                null as any,
            );
            const res = await getTeacherInvite("tok");
            expect(res.success).toBe(false);
            expect(res.message).toBe("ไม่พบคำเชิญ");
        });

        it("returns fail if accepted", async () => {
            vi.mocked(prisma.teacherInvite.findUnique).mockResolvedValue({
                acceptedAt: new Date(),
            } as any);
            const res = await getTeacherInvite("tok");
            expect(res.success).toBe(false);
            expect(res.message).toBe("คำเชิญนี้ถูกใช้งานแล้ว");
        });

        it("returns fail if expired", async () => {
            vi.mocked(prisma.teacherInvite.findUnique).mockResolvedValue({
                acceptedAt: null,
                expiresAt: new Date(Date.now() - 10000),
            } as any);
            const res = await getTeacherInvite("tok");
            expect(res.success).toBe(false);
            expect(res.message).toBe("คำเชิญหมดอายุแล้ว");
        });

        it("succeeds if valid", async () => {
            vi.mocked(prisma.teacherInvite.findUnique).mockResolvedValue({
                acceptedAt: null,
                expiresAt: new Date(Date.now() + 10000),
            } as any);
            const res = await getTeacherInvite("tok");
            expect(res.success).toBe(true);
            expect(res.message).toBe("พบคำเชิญ");
        });

        it("catches error", async () => {
            vi.mocked(prisma.teacherInvite.findUnique).mockRejectedValue(
                new Error("Err"),
            );
            const res = await getTeacherInvite("tok");
            expect(res.success).toBe(false);
        });
    });

    describe("getMyTeacherInvites", () => {
        it("returns empty array if no schoolId", async () => {
            vi.mocked(requireAuth).mockResolvedValue({
                user: { id: "u1" },
            } as any);
            vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any);
            const res = await getMyTeacherInvites();
            expect(res.success).toBe(true);
            expect(res.invites).toEqual([]);
        });

        it("returns invites if schoolId is found in session", async () => {
            vi.mocked(requireAuth).mockResolvedValue({
                user: { id: "u1", schoolId: "s1" },
            } as any);
            vi.mocked(prisma.teacherInvite.findMany).mockResolvedValue([
                { id: "i1" },
            ] as any);
            const res = await getMyTeacherInvites();
            expect(res.success).toBe(true);
            expect(res.invites).toHaveLength(1);
        });

        it("catches error", async () => {
            vi.mocked(requireAuth).mockRejectedValue(new Error("Err"));
            const res = await getMyTeacherInvites();
            expect(res.success).toBe(false);
            expect(res.invites).toEqual([]);
        });
    });
});
