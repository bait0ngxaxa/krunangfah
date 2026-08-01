"use server";

import { prisma } from "@/lib/database/prisma";
import { unstable_cache } from "next/cache";
import { getRequiredSessionUser } from "@/lib/auth/viewer-context";
import { handleQueryError } from "./error-handler";
import {
    queryEmpty,
    queryForbidden,
    querySuccess,
    type QueryResult,
} from "./query-result";
import {
    DASHBOARD_TAG,
    SCHOOLS_TAG,
    buildDashboardDataCacheKey,
    buildSchoolsListCacheKey,
} from "./dashboard/cache";

async function getCachedDashboardData(userId: string, role: string) {
    const cacheKey = buildDashboardDataCacheKey({ userId, role });
    const cachedFetcher = unstable_cache(
        async () => {
            if (role === "system_admin") {
                const studentCount = await prisma.student.count({
                    where: {
                        disabledAt: null,
                        isTestData: false,
                        school: { disabledAt: null, isTestData: false },
                    },
                });
                const schoolCount = await prisma.school.count({
                    where: { disabledAt: null, isTestData: false },
                });
                return { teacher: null, studentCount, schoolCount };
            }

            const teacher = await prisma.teacher.findUnique({
                where: { userId },
                include: {
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
                    disabledAt: null,
                    isTestData: false,
                    school: { disabledAt: null, isTestData: false },
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
                where: { disabledAt: null, isTestData: false },
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

type DashboardData = Awaited<ReturnType<typeof getCachedDashboardData>>;
type SchoolOption = { id: string; name: string };

export async function getDashboardData(): Promise<QueryResult<DashboardData>> {
    try {
        const sessionUser = await getRequiredSessionUser();
        const data = await getCachedDashboardData(
            sessionUser.userId,
            sessionUser.role,
        );
        return sessionUser.role !== "system_admin" && !data.teacher
            ? queryEmpty(data)
            : querySuccess(data);
    } catch (error) {
        return handleQueryError("Get dashboard data error:", error);
    }
}

export async function getSchools(): Promise<QueryResult<SchoolOption[]>> {
    try {
        const sessionUser = await getRequiredSessionUser();

        if (sessionUser.role !== "system_admin") {
            return queryForbidden();
        }

        const schools = await getCachedSchools();
        return schools.length === 0
            ? queryEmpty(schools)
            : querySuccess(schools);
    } catch (error) {
        return handleQueryError("Get schools error:", error);
    }
}
