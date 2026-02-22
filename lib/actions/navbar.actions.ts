"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Check if the current user has any students
 * class_teacher: checks students in their advisoryClass (excluding referred-out) + students referred to them
 * school_admin/system_admin: checks students in their school
 */
export async function hasStudents(): Promise<boolean> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return false;
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                schoolId: true,
                role: true,
                teacher: { select: { advisoryClass: true } },
            },
        });
        if (!dbUser) return false;

        if (dbUser.role === "class_teacher") {
            const advisoryClass = dbUser.teacher?.advisoryClass;
            if (!advisoryClass) return false;

            // Count students visible to this teacher (referral-aware)
            const count = await prisma.student.count({
                where: {
                    ...(dbUser.schoolId ? { schoolId: dbUser.schoolId } : {}),
                    OR: [
                        // Students in advisory class without referral
                        { class: advisoryClass, referral: { is: null } },
                        // Students referred to this teacher
                        { referral: { toTeacherUserId: session.user.id } },
                    ],
                },
            });

            return count > 0;
        }

        // school_admin / system_admin
        const where: { schoolId?: string } = {};
        if (dbUser.schoolId) {
            where.schoolId = dbUser.schoolId;
        }

        const studentCount = await prisma.student.count({ where });
        return studentCount > 0;
    } catch (error) {
        console.error("Error checking students:", error);
        return false;
    }
}
