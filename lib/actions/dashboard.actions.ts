"use server";

import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getRequiredSessionUser } from "@/lib/auth/viewer-context";
import {
    DASHBOARD_TAG,
    SCHOOLS_TAG,
    buildDashboardDataCacheKey,
    buildSchoolsListCacheKey,
    revalidateDashboardCache,
} from "./dashboard/cache";

async function getCachedDashboardData(userId: string, role: string) {
    const cacheKey = buildDashboardDataCacheKey({ userId, role });
    const cachedFetcher = unstable_cache(
        async () => {
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
        cacheKey,
        {
            revalidate: 60,
            tags: [DASHBOARD_TAG],
        },
    );

    return cachedFetcher();
}

async function getCachedSchools() {
    const cachedFetcher = unstable_cache(
        async () =>
            prisma.school.findMany({
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            }),
        buildSchoolsListCacheKey(),
        {
            revalidate: 60,
            tags: [SCHOOLS_TAG],
        },
    );

    return cachedFetcher();
}

export async function getDashboardData() {
    const sessionUser = await getRequiredSessionUser();

    return getCachedDashboardData(sessionUser.userId, sessionUser.role);
}

export async function revalidateDashboard() {
    revalidateDashboardCache();
}

export async function getSchools(): Promise<{ id: string; name: string }[]> {
    const sessionUser = await getRequiredSessionUser();

    if (sessionUser.role !== "system_admin") {
        return [];
    }

    return getCachedSchools();
}
