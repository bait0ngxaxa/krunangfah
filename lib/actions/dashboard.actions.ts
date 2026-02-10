"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { unstable_cache, revalidateTag } from "next/cache";

// Cached dashboard data (revalidates every 60 seconds)
const getCachedDashboardData = unstable_cache(
    async (userId: string, role: string) => {
        // system_admin: show aggregate data without teacher profile
        if (role === "system_admin") {
            const studentCount = await prisma.student.count();
            const schoolCount = await prisma.school.count();
            return { teacher: null, studentCount, schoolCount };
        }

        const teacher = await prisma.teacher.findUnique({
            where: { userId },
            include: {
                academicYear: true,
                user: {
                    include: { school: true },
                },
            },
        });

        if (!teacher || !teacher.user.schoolId) {
            return { teacher, studentCount: 0 };
        }

        const studentCount = await prisma.student.count({
            where: {
                schoolId: teacher.user.schoolId,
                ...(role === "class_teacher" && {
                    class: teacher.advisoryClass,
                }),
            },
        });

        return { teacher, studentCount };
    },
    ["dashboard-data"],
    {
        revalidate: 60, // Cache for 60 seconds
        tags: ["dashboard"],
    }
);

export async function getDashboardData() {
    const session = await requireAuth();
    const userId = session.user.id;
    const role = session.user.role;

    // Use cached data
    return getCachedDashboardData(userId, role);
}

// Function to revalidate dashboard cache (call after mutations)
export async function revalidateDashboard() {
    revalidateTag("dashboard", "default");
}

/**
 * Get all schools for school selector dropdown
 * Used by system_admin to filter students by school
 */
export async function getSchools(): Promise<{ id: string; name: string }[]> {
    const session = await requireAuth();

    if (session.user.role !== "system_admin") {
        return [];
    }

    return prisma.school.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });
}
