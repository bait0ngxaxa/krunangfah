/**
 * Hospital Referral Actions
 * Toggle referredToHospital status for PHQ results
 *
 * Access control:
 * - school_admin: toggle ได้ทุกนักเรียนในโรงเรียน
 * - class_teacher: toggle ได้เฉพาะนักเรียนในห้องที่ดูแล (advisoryClass)
 */

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAuth } from "@/lib/session";
import { toggleHospitalReferralSchema } from "@/lib/validations/hospital-referral.validation";

export async function toggleHospitalReferral(phqResultId: string) {
    try {
        // Validate input
        const validated = toggleHospitalReferralSchema.parse({ phqResultId });

        const session = await requireAuth();
        const userId = session.user.id;
        const userRole = session.user.role;

        // Get PHQ result with student info for authorization check
        const phqResult = await prisma.phqResult.findUnique({
            where: { id: validated.phqResultId },
            select: {
                referredToHospital: true,
                studentId: true,
                student: {
                    select: {
                        class: true,
                        schoolId: true,
                    },
                },
            },
        });

        if (!phqResult) {
            return { success: false, error: "ไม่พบข้อมูลผลประเมิน" };
        }

        // system_admin can access all schools — skip school/class check
        if (userRole !== "system_admin") {
            // Verify user belongs to the same school
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    schoolId: true,
                    teacher: {
                        select: { advisoryClass: true },
                    },
                },
            });

            if (!user?.schoolId || user.schoolId !== phqResult.student.schoolId) {
                return { success: false, error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" };
            }

            // class_teacher: ตรวจว่านักเรียนอยู่ในห้องที่ดูแลหรือไม่
            if (userRole === "class_teacher") {
                const advisoryClass = user.teacher?.advisoryClass;
                if (!advisoryClass || phqResult.student.class !== advisoryClass) {
                    return {
                        success: false,
                        error: "คุณสามารถแก้ไขข้อมูลได้เฉพาะนักเรียนในห้องที่คุณดูแลเท่านั้น",
                    };
                }
            }
        }

        // Toggle status
        await prisma.phqResult.update({
            where: { id: validated.phqResultId },
            data: {
                referredToHospital: !phqResult.referredToHospital,
            },
        });

        revalidatePath(`/students/${phqResult.studentId}`);
        revalidateTag("analytics", "default");

        return {
            success: true,
            newStatus: !phqResult.referredToHospital,
        };
    } catch (error) {
        console.error("Error toggling hospital referral:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตสถานะ" };
    }
}
