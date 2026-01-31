"use server";

import { prisma } from "@/lib/prisma";
import { type UserRole } from "@/types/auth.types";

export async function getDashboardData(userId: string, role: UserRole) {
    // Check if user has teacher profile
    const teacher = await prisma.teacher.findUnique({
        where: { userId },
        include: {
            academicYear: true,
            school: true,
        },
    });

    if (!teacher) {
        return { teacher: null, studentCount: 0 };
    }

    // Count students for this teacher
    const studentCount = await prisma.student.count({
        where: {
            schoolId: teacher.schoolId,
            ...(role === "class_teacher" && {
                class: teacher.advisoryClass,
            }),
        },
    });

    return { teacher, studentCount };
}
