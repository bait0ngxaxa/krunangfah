/**
 * Hospital Referral Actions
 * Update referredToHospital status and hospitalName for PHQ results
 *
 * Access control:
 * - system_admin: update ได้ทุกนักเรียน
 * - school_admin: update ได้ทุกนักเรียนในโรงเรียน
 * - class_teacher: update ได้เฉพาะนักเรียนในห้องที่ดูแล (advisoryClass)
 */

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAuth } from "@/lib/session";
import { updateHospitalReferralSchema } from "@/lib/validations/hospital-referral.validation";

interface UpdateHospitalReferralParams {
    phqResultId: string;
    referredToHospital: boolean;
    hospitalName?: string;
}

export async function updateHospitalReferral(
    params: UpdateHospitalReferralParams,
) {
    try {
        const validated = updateHospitalReferralSchema.parse(params);

        const session = await requireAuth();
        const userId = session.user.id;
        const userRole = session.user.role;

        // Fetch PHQ result + user data in parallel (for non-system_admin)
        const [phqResult, user] = await Promise.all([
            prisma.phqResult.findUnique({
                where: { id: validated.phqResultId },
                select: {
                    studentId: true,
                    student: {
                        select: {
                            class: true,
                            schoolId: true,
                        },
                    },
                },
            }),
            userRole !== "system_admin"
                ? prisma.user.findUnique({
                      where: { id: userId },
                      select: {
                          schoolId: true,
                          teacher: {
                              select: { advisoryClass: true },
                          },
                      },
                  })
                : Promise.resolve(null),
        ]);

        if (!phqResult) {
            return { success: false, error: "ไม่พบข้อมูลผลประเมิน" };
        }

        // system_admin can access all schools — skip school/class check
        if (userRole !== "system_admin") {
            if (
                !user?.schoolId ||
                user.schoolId !== phqResult.student.schoolId
            ) {
                return { success: false, error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" };
            }

            // class_teacher: ตรวจว่านักเรียนอยู่ในห้องที่ดูแลหรือได้รับส่งต่อมา
            if (userRole === "class_teacher") {
                const advisoryClass = user.teacher?.advisoryClass;
                const isInAdvisoryClass = advisoryClass && phqResult.student.class === advisoryClass;

                if (!isInAdvisoryClass) {
                    // Check if student was referred to this teacher
                    const referral = await prisma.studentReferral.findUnique({
                        where: { studentId: phqResult.studentId },
                        select: { toTeacherUserId: true },
                    });

                    if (referral?.toTeacherUserId !== userId) {
                        return {
                            success: false,
                            error: "คุณสามารถแก้ไขข้อมูลได้เฉพาะนักเรียนในห้องที่คุณดูแลเท่านั้น",
                        };
                    }
                }
            }
        }

        // Update referral status and hospital name
        await prisma.phqResult.update({
            where: { id: validated.phqResultId },
            data: {
                referredToHospital: validated.referredToHospital,
                hospitalName: validated.referredToHospital
                    ? (validated.hospitalName?.trim() ?? null)
                    : null,
            },
        });

        revalidatePath(`/students/${phqResult.studentId}`);
        revalidateTag("analytics", "default");

        return {
            success: true,
            referredToHospital: validated.referredToHospital,
        };
    } catch (error) {
        console.error("Error updating hospital referral:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตสถานะ" };
    }
}
