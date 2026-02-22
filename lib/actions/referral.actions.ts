/**
 * Student Referral Actions
 * ส่งต่อนักเรียนระหว่างครูในโรงเรียนเดียวกัน
 *
 * Access control:
 * - class_teacher: ส่งต่อได้เฉพาะนักเรียนใน advisoryClass หรือที่ถูกส่งต่อมาหาตน
 * - school_admin: ส่งต่อนักเรียนได้ทุกคนในโรงเรียน
 * - system_admin: ส่งต่อนักเรียนได้ทุกคน
 */

"use server";

import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { requireAuth, isSystemAdmin } from "@/lib/session";
import {
    createReferralSchema,
    revokeReferralSchema,
} from "@/lib/validations/referral.validation";
import type {
    ReferralActionResponse,
    TeacherPickerOption,
    ReferredOutStudent,
} from "@/types/referral.types";

/**
 * Create or replace a student referral
 * Upserts on studentId — one active referral per student
 */
export async function createStudentReferral(input: {
    studentId: string;
    toTeacherUserId: string;
}): Promise<ReferralActionResponse> {
    try {
        const validated = createReferralSchema.parse(input);
        const session = await requireAuth();
        const userId = session.user.id;
        const userRole = session.user.role;

        // Fetch student + current user data in parallel
        const [student, fromUser, toUser] = await Promise.all([
            prisma.student.findUnique({
                where: { id: validated.studentId },
                select: {
                    id: true,
                    class: true,
                    schoolId: true,
                    referral: {
                        select: { toTeacherUserId: true },
                    },
                },
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    schoolId: true,
                    teacher: {
                        select: {
                            advisoryClass: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            }),
            prisma.user.findUnique({
                where: { id: validated.toTeacherUserId },
                select: {
                    id: true,
                    schoolId: true,
                    teacher: { select: { firstName: true, lastName: true } },
                },
            }),
        ]);

        if (!student) {
            return { success: false, message: "ไม่พบข้อมูลนักเรียน" };
        }
        if (!toUser || !toUser.teacher) {
            return { success: false, message: "ไม่พบข้อมูลครูปลายทาง" };
        }
        if (validated.toTeacherUserId === userId) {
            return { success: false, message: "ไม่สามารถส่งต่อให้ตัวเองได้" };
        }

        // Access control
        if (!isSystemAdmin(userRole)) {
            if (!fromUser?.schoolId || fromUser.schoolId !== student.schoolId) {
                return {
                    success: false,
                    message: "ไม่มีสิทธิ์เข้าถึงนักเรียนนี้",
                };
            }

            // Target teacher must be in the same school
            if (toUser.schoolId !== student.schoolId) {
                return {
                    success: false,
                    message: "ครูปลายทางไม่ได้อยู่ในโรงเรียนเดียวกัน",
                };
            }

            // ส่งต่อได้เฉพาะให้ school_admin เท่านั้น (ทั้ง school_admin และ class_teacher)
            const targetUser = await prisma.user.findUnique({
                where: { id: validated.toTeacherUserId },
                select: { role: true },
            });
            if (targetUser?.role !== "school_admin") {
                return {
                    success: false,
                    message: "สามารถส่งต่อให้ครูนางฟ้าเท่านั้น",
                };
            }

            if (userRole === "class_teacher") {
                const advisoryClass = fromUser.teacher?.advisoryClass;
                const isInAdvisoryClass =
                    advisoryClass && student.class === advisoryClass;
                const isReferredToMe =
                    student.referral?.toTeacherUserId === userId;

                if (!isInAdvisoryClass && !isReferredToMe) {
                    return {
                        success: false,
                        message:
                            "คุณสามารถส่งต่อได้เฉพาะนักเรียนในห้องที่คุณดูแลหรือที่ถูกส่งต่อมาหาคุณเท่านั้น",
                    };
                }
            }
        }

        // Upsert — one referral per student
        const referral = await prisma.studentReferral.upsert({
            where: { studentId: validated.studentId },
            update: {
                fromTeacherUserId: userId,
                toTeacherUserId: validated.toTeacherUserId,
            },
            create: {
                studentId: validated.studentId,
                fromTeacherUserId: userId,
                toTeacherUserId: validated.toTeacherUserId,
            },
        });

        revalidateTag("students", "default");
        revalidateTag("student-detail", "default");

        const fromName = fromUser?.teacher
            ? `${fromUser.teacher.firstName} ${fromUser.teacher.lastName}`
            : "ไม่ทราบ";
        const toName = `${toUser.teacher.firstName} ${toUser.teacher.lastName}`;

        return {
            success: true,
            message: `ส่งต่อนักเรียนให้ ${toName} เรียบร้อยแล้ว`,
            data: {
                id: referral.id,
                studentId: referral.studentId,
                fromTeacherUserId: referral.fromTeacherUserId,
                toTeacherUserId: referral.toTeacherUserId,
                fromTeacherName: fromName,
                toTeacherName: toName,
                createdAt: referral.createdAt,
            },
        };
    } catch (error) {
        console.error("Error creating student referral:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งต่อนักเรียน" };
    }
}

/**
 * Revoke a student referral
 * Only fromTeacher, school_admin, or system_admin can revoke
 */
export async function revokeStudentReferral(input: {
    referralId: string;
}): Promise<ReferralActionResponse> {
    try {
        const validated = revokeReferralSchema.parse(input);
        const session = await requireAuth();
        const userId = session.user.id;
        const userRole = session.user.role;

        const referral = await prisma.studentReferral.findUnique({
            where: { id: validated.referralId },
            include: {
                student: { select: { schoolId: true } },
            },
        });

        if (!referral) {
            return { success: false, message: "ไม่พบข้อมูลการส่งต่อ" };
        }

        // Access control: only fromTeacher, school_admin of same school, or system_admin
        if (!isSystemAdmin(userRole)) {
            if (
                userRole === "class_teacher" &&
                referral.fromTeacherUserId !== userId
            ) {
                return {
                    success: false,
                    message:
                        "คุณสามารถเรียกคืนได้เฉพาะการส่งต่อที่คุณสร้างเท่านั้น",
                };
            }

            if (userRole === "school_admin") {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { schoolId: true },
                });
                if (user?.schoolId !== referral.student.schoolId) {
                    return {
                        success: false,
                        message: "ไม่มีสิทธิ์เรียกคืนการส่งต่อนี้",
                    };
                }
            }
        }

        await prisma.studentReferral.delete({
            where: { id: validated.referralId },
        });

        revalidateTag("students", "default");
        revalidateTag("student-detail", "default");

        return { success: true, message: "เรียกคืนการส่งต่อเรียบร้อยแล้ว" };
    } catch (error) {
        console.error("Error revoking student referral:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการเรียกคืน" };
    }
}

/**
 * Get students that the current teacher has referred out
 */
export async function getReferredOutStudents(): Promise<ReferredOutStudent[]> {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const referrals = await prisma.studentReferral.findMany({
            where: { fromTeacherUserId: userId },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        class: true,
                        studentId: true,
                    },
                },
                toTeacher: {
                    select: {
                        teacher: {
                            select: { firstName: true, lastName: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return referrals.map((r) => ({
            id: r.student.id,
            firstName: r.student.firstName,
            lastName: r.student.lastName,
            class: r.student.class,
            studentId: r.student.studentId,
            toTeacherName: r.toTeacher.teacher
                ? `${r.toTeacher.teacher.firstName} ${r.toTeacher.teacher.lastName}`
                : "ไม่ทราบ",
            referralId: r.id,
            referredAt: r.createdAt,
        }));
    } catch (error) {
        console.error("Error getting referred out students:", error);
        return [];
    }
}

/**
 * Get teachers in the same school for the referral picker
 * Excludes the current user
 *
 * Role-based filtering:
 * - school_admin: sees only other school_admins
 * - class_teacher: sees all teachers (school_admin + class_teacher)
 */
export async function getTeachersForReferral(): Promise<TeacherPickerOption[]> {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { schoolId: true },
        });

        if (!currentUser?.schoolId) return [];

        // ทั้ง school_admin และ class_teacher ส่งต่อได้เฉพาะ school_admin เท่านั้น
        const roleFilter = { role: "school_admin" as const };

        const teachers = await prisma.teacher.findMany({
            where: {
                user: {
                    schoolId: currentUser.schoolId,
                    id: { not: userId },
                    ...roleFilter,
                },
            },
            select: {
                userId: true,
                firstName: true,
                lastName: true,
                advisoryClass: true,
            },
            orderBy: [{ advisoryClass: "asc" }, { firstName: "asc" }],
        });

        return teachers.map((t) => ({
            userId: t.userId,
            name: `${t.firstName} ${t.lastName}`,
            advisoryClass: t.advisoryClass,
        }));
    } catch (error) {
        console.error("Error getting teachers for referral:", error);
        return [];
    }
}
