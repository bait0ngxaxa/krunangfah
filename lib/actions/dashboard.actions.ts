"use server";

import { prisma } from "@/lib/prisma";
import { unstable_cache, revalidateTag } from "next/cache";
import { getRequiredSessionUser } from "@/lib/auth/viewer-context";

const getCachedDashboardData = unstable_cache(
    async (userId: string, role: string) => {
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
        revalidate: 60,
        tags: ["dashboard"],
    },
);

export async function getDashboardData() {
    const sessionUser = await getRequiredSessionUser();

    return getCachedDashboardData(sessionUser.userId, sessionUser.role);
}

export async function revalidateDashboard() {
    revalidateTag("dashboard", "default");
}

export async function getSchools(): Promise<{ id: string; name: string }[]> {
    const sessionUser = await getRequiredSessionUser();

    if (sessionUser.role !== "system_admin") {
        return [];
    }

    return prisma.school.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });
}
