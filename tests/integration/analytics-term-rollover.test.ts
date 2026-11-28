/**
 * Integration Test: the first analytics request after a term rollover
 *
 * The real lifecycle runs (only the clock is moved to a synthetic term). It
 * must provision the new term before any cache fill, invalidate only Redis
 * (never Next.js tags or paths, which are forbidden during render and cache
 * execution), and the default request must return the new term's data.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createMockUsers, mockSession } from "./helpers/auth-mock";
import {
    createTestAcademicYear,
    createTestSchool,
    createTestUser,
} from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { prisma } from "@/lib/database/prisma";

// Bangkok 1 Dec 2197 = B.E. 2740 semester 2; far from any real or suite term.
const ROLLOVER_YEAR = 2740;
const ROLLOVER_NOW = new Date("2197-12-01T05:00:00.000Z");

const redisMocks = vi.hoisted(() => ({
    revalidateRedisAnalyticsCache: vi.fn(async () => {}),
}));
const nextCacheMocks = vi.hoisted(() => ({
    updateTag: vi.fn(),
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
}));

// Owned here (not via auth-mock) so the invalidation calls are observable spies.
vi.mock("next/cache", () => ({
    ...nextCacheMocks,
    unstable_cache:
        (fn: (...args: unknown[]) => unknown) =>
        (...args: unknown[]) =>
            fn(...args),
}));

vi.mock("@/lib/cache/redis-lock", () => ({
    acquireRedisLock: vi.fn(async (key: string) => ({
        status: "acquired" as const,
        lock: { key, token: "rollover-test" },
    })),
    releaseRedisLock: vi.fn(async () => {}),
}));
vi.mock("@/lib/actions/analytics/redis-cache", async (importOriginal) => {
    const actual = await importOriginal<
        typeof import("@/lib/actions/analytics/redis-cache")
    >();
    const miss = async () => ({ data: null, versionedKeyParts: null });
    return {
        ...actual,
        readRedisCachedAnalyticsData: miss,
        readRedisCachedSystemOverview: miss,
        setRedisCachedAnalyticsData: async () => {},
        setRedisCachedSystemOverview: async () => {},
        revalidateRedisAnalyticsCache: redisMocks.revalidateRedisAnalyticsCache,
    };
});

const USERS = createMockUsers("rollover");
const { getAnalyticsSummary } = await import("@/lib/actions/analytics/main");

describe("Integration: analytics after a term rollover", () => {
    let schoolId = "";
    let classId = "";
    let previousCurrentIds: string[] = [];

    beforeAll(async () => {
        previousCurrentIds = (
            await prisma.academicYear.findMany({
                where: { isCurrent: true },
                select: { id: true },
            })
        ).map((term) => term.id);

        // Semester 1 is the term before the rollover; semester 2 does not exist yet.
        const semesterOne = await createTestAcademicYear({
            year: ROLLOVER_YEAR,
            semester: 1,
        });
        await prisma.academicYear.update({
            where: { id: semesterOne.id },
            data: { isCurrent: true },
        });

        schoolId = (await createTestSchool({ name: "โรงเรียนสังเคราะห์ขึ้นเทอม" })).id;
        USERS.schoolAdmin.schoolId = schoolId;
        await createTestUser(USERS.schoolAdmin, schoolId);
        const schoolClass = await prisma.schoolClass.create({
            data: { schoolId, name: "ม.1/1", expectedStudentCount: 33 },
        });
        classId = schoolClass.id;
        await prisma.schoolClassTerm.create({
            data: {
                schoolClassId: classId,
                academicYearId: semesterOne.id,
                expectedStudentCount: 33,
            },
        });

        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(ROLLOVER_NOW);
    });

    afterAll(async () => {
        vi.useRealTimers();
        // The lifecycle created the rollover term itself; remove it (term rows
        // cascade) and hand "current" back to whatever held it before.
        await prisma.academicYear
            .deleteMany({ where: { year: ROLLOVER_YEAR, semester: 2 } })
            .catch(() => {});
        await prisma.academicYear
            .updateMany({ where: { year: ROLLOVER_YEAR }, data: { isCurrent: false } })
            .catch(() => {});
        if (previousCurrentIds.length > 0) {
            await prisma.academicYear
                .updateMany({
                    where: { id: { in: previousCurrentIds } },
                    data: { isCurrent: true },
                })
                .catch(() => {});
        }
        await cleanupAll();
    });

    it("provisions the new term and serves its data on the default request", async () => {
        mockSession(USERS.schoolAdmin);

        const result = await getAnalyticsSummary();

        expect(result.status).toBe("success");
        if (result.status !== "success") throw new Error("Expected analytics data");
        const newTerm = await prisma.academicYear.findUniqueOrThrow({
            where: { year_semester: { year: ROLLOVER_YEAR, semester: 2 } },
            select: { id: true, isCurrent: true },
        });
        expect(newTerm.isCurrent).toBe(true);
        await expect(
            prisma.schoolClassTerm.findUnique({
                where: {
                    schoolClassId_academicYearId: {
                        schoolClassId: classId,
                        academicYearId: newTerm.id,
                    },
                },
                select: { expectedStudentCount: true },
            }),
        ).resolves.toEqual({ expectedStudentCount: 33 });
        // The new term's denominator, not the previous term's data.
        expect(result.data.selectedAcademicTermExists).toBe(true);
        expect(result.data.totalStudents).toBe(33);

        expect(redisMocks.revalidateRedisAnalyticsCache).toHaveBeenCalledTimes(1);
        expect(nextCacheMocks.updateTag).not.toHaveBeenCalled();
        expect(nextCacheMocks.revalidateTag).not.toHaveBeenCalled();
        expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
    });
});
