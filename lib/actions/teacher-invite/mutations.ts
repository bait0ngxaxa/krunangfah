"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { hashPassword } from "@/lib/user";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import type { TeacherInviteFormData } from "@/lib/validations/teacher-invite.validation";
import type { InviteResponse } from "./types";
import { logError } from "@/lib/utils/logging";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";

/**
 * สร้าง invite สำหรับครูผู้ดูแล
 */
export async function createTeacherInvite(
    input: TeacherInviteFormData,
): Promise<InviteResponse> {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        // Allow only school_admin and system_admin to create invites.
        if (
            session.user.role !== "system_admin" &&
            session.user.role !== "school_admin"
        ) {
            return {
                success: false,
                message: "ไม่มีสิทธิ์สร้างคำเชิญ",
            };
        }

        // Use creator schoolId as invite scope.
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { schoolId: true },
        });

        if (!user?.schoolId) {
            return {
                success: false,
                message: "คุณยังไม่ได้เชื่อมต่อกับโรงเรียน",
            };
        }

        const schoolId = user.schoolId;

        // Token is single-use and must be unguessable.
        const token = randomBytes(32).toString("hex");

        // Invite expires in 7 days.
        const invite = await runSerializableTransaction(async (tx) => {
            const existingUser = await tx.user.findUnique({
                where: { email: input.email },
                select: { id: true },
            });

            if (existingUser) {
                return {
                    success: false,
                    message: "อีเมลนี้มีผู้ใช้งานแล้ว",
                } satisfies InviteResponse;
            }

            const existingInvite = await tx.teacherInvite.findFirst({
                where: {
                    email: input.email,
                    acceptedAt: null,
                },
                select: {
                    id: true,
                    expiresAt: true,
                },
            });

            if (existingInvite && existingInvite.expiresAt > new Date()) {
                return {
                    success: false,
                    message: "มีคำเชิญที่รอดำเนินการสำหรับอีเมลนี้แล้ว",
                } satisfies InviteResponse;
            }

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            const inviteData = {
                token,
                email: input.email,
                firstName: input.firstName,
                lastName: input.lastName,
                age: Number(input.age),
                userRole: input.userRole,
                advisoryClass: normalizeClassName(input.advisoryClass),
                academicYearId: input.academicYearId,
                schoolId,
                schoolRole: input.schoolRole,
                projectRole: input.projectRole,
                invitedById: userId,
                expiresAt,
            };

            const persistedInvite = existingInvite
                ? await tx.teacherInvite.update({
                      where: { id: existingInvite.id },
                      data: inviteData,
                      include: {
                          school: true,
                          academicYear: true,
                      },
                  })
                : await tx.teacherInvite.create({
                      data: inviteData,
                      include: {
                          school: true,
                          academicYear: true,
                      },
                  });

            return {
                success: true,
                message: "สร้างคำเชิญสำเร็จ",
                invite: persistedInvite,
                inviteLink: `${process.env.NEXTAUTH_URL}/invite/${token}`,
            } satisfies InviteResponse;
        });

        if (!invite.success) {
            return invite;
        }

        revalidatePath("/teachers/add");
        return invite;
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return {
                success: false,
                message: "มีคำเชิญที่รอดำเนินการสำหรับอีเมลนี้แล้ว",
            };
        }

        logError("Create teacher invite error:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการสร้างคำเชิญ",
        };
    }
}

/**
 * ยอมรับคำเชิญและสร้าง account
 */
export async function acceptTeacherInvite(
    token: string,
    password: string,
): Promise<InviteResponse> {
    try {
        // Password is stored hashed only.
        const hashedPassword = await hashPassword(password);

        return await runSerializableTransaction(async (tx) => {
            const claimResult = await tx.teacherInvite.updateMany({
                where: {
                    token,
                    acceptedAt: null,
                    expiresAt: { gt: new Date() },
                },
                data: { acceptedAt: new Date() },
            });

            if (claimResult.count === 0) {
                const inviteState = await tx.teacherInvite.findUnique({
                    where: { token },
                    select: {
                        id: true,
                        acceptedAt: true,
                        expiresAt: true,
                    },
                });

                if (!inviteState) {
                    return { success: false, message: "ไม่พบคำเชิญ" };
                }

                if (inviteState.acceptedAt) {
                    return { success: false, message: "คำเชิญนี้ถูกใช้งานแล้ว" };
                }

                return { success: false, message: "คำเชิญหมดอายุแล้ว" };
            }

            const invite = await tx.teacherInvite.findUnique({
                where: { token },
            });

            if (!invite) {
                return { success: false, message: "ไม่พบคำเชิญ" };
            }

            const user = await tx.user.create({
                data: {
                    email: invite.email,
                    name: `${invite.firstName} ${invite.lastName}`,
                    password: hashedPassword,
                    role: invite.userRole,
                    schoolId: invite.schoolId,
                },
            });

            await tx.teacher.create({
                data: {
                    userId: user.id,
                    firstName: invite.firstName,
                    lastName: invite.lastName,
                    age: invite.age,
                    advisoryClass: invite.advisoryClass,
                    academicYearId: invite.academicYearId,
                    schoolRole: invite.schoolRole,
                    projectRole: invite.projectRole,
                },
            });

            return {
                success: true,
                message: "ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ",
            };
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return {
                success: false,
                message: "อีเมลนี้มีผู้ใช้งานแล้ว",
            };
        }

        logError("Accept teacher invite error:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการลงทะเบียน",
        };
    }
}

/**
 * ยกเลิกคำเชิญครู (ลบออก)
 * primary school_admin สามารถยกเลิก invite ของโรงเรียนตัวเอง
 * system_admin สามารถยกเลิก invite ไหนก็ได้
 */
export async function revokeTeacherInvite(
    inviteId: string,
): Promise<InviteResponse> {
    try {
        const session = await requireAuth();

        const invite = await prisma.teacherInvite.findUnique({
            where: { id: inviteId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                acceptedAt: true,
                schoolId: true,
            },
        });

        if (!invite) {
            return { success: false, message: "ไม่พบคำเชิญ" };
        }

        if (invite.acceptedAt) {
            return {
                success: false,
                message: "คำเชิญนี้ถูกใช้งานแล้ว ไม่สามารถยกเลิกได้",
            };
        }

        // Access control: system_admin (any invite) OR primary school_admin (same school only).
        const isSystemAdmin = session.user.role === "system_admin";
        const isPrimaryOfSchool =
            session.user.role === "school_admin" &&
            session.user.isPrimary &&
            session.user.schoolId === invite.schoolId;

        if (!isSystemAdmin && !isPrimaryOfSchool) {
            return { success: false, message: "ไม่มีสิทธิ์ยกเลิกคำเชิญ" };
        }

        await prisma.teacherInvite.delete({
            where: { id: inviteId },
        });

        // Keep roster status consistent when invite is revoked.
        const rosterMatch = await prisma.schoolTeacherRoster.findFirst({
            where: {
                schoolId: invite.schoolId,
                OR: [
                    { email: invite.email },
                    {
                        firstName: invite.firstName,
                        lastName: invite.lastName,
                    },
                ],
            },
        });
        if (rosterMatch) {
            await prisma.schoolTeacherRoster.update({
                where: { id: rosterMatch.id },
                data: { inviteSent: false },
            });
        }

        revalidatePath("/teachers/add");

        return {
            success: true,
            message: `ยกเลิกคำเชิญสำหรับ "${invite.email}" สำเร็จ`,
        };
    } catch (error) {
        logError("Revoke teacher invite error:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการยกเลิกคำเชิญ",
        };
    }
}
