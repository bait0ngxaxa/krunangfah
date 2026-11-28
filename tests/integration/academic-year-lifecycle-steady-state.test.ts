/**
 * Integration Test: the current-term lifecycle stays read-only in a steady
 * term and provisions exactly once on rollover.
 *
 * Real Postgres. CI has no Redis, so the lock and the provisioned marker use
 * in-memory fakes with the same contract; only the clock is moved to a
 * synthetic term far from any real or suite term.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestAcademicYear, createTestSchool } from "./helpers/seed";
import { cleanupAll } from "./helpers/cleanup";
import { prisma } from "@/lib/database/prisma";

// Bangkok 1 Jun 2202 = B.E. 2745 semester 1; 1 Dec 2202 = semester 2.
const LIFECYCLE_YEAR = 2745;
const STEADY_NOW = new Date("2202-06-01T05:00:00.000Z");
const ROLLOVER_NOW = new Date("2202-12-01T05:00:00.000Z");
const STEADY_MARKER_KEY = `academic-year-lifecycle:provisioned:${LIFECYCLE_YEAR}:1`;
const ROLLOVER_MARKER_KEY = `academic-year-lifecycle:provisioned:${LIFECYCLE_YEAR}:2`;

const fakes = vi.hoisted(() => ({
    markers: new Map<string, string>(),
    acquireRedisLock: vi.fn(async (key: string) => ({
        status: "acquired" as const,
        lock: { key, token: "lifecycle-steady-state" },
    })),
}));

vi.mock("@/lib/cache/redis-lock", () => ({
    acquireRedisLock: fakes.acquireRedisLock,
    releaseRedisLock: vi.fn(async () => {}),
}));
vi.mock("@/lib/cache/redis-marker", () => ({
    readRedisMarker: vi.fn(async (key: string) => {
        const value = fakes.markers.get(key);
        return value === undefined
            ? { status: "absent" as const }
            : { status: "present" as const, value };
    }),
    writeRedisMarker: vi.fn(async (key: string, value: string) => {
        fakes.markers.set(key, value);
        return true;
    }),
    deleteRedisMarker: vi.fn(async (key: string) => {
        fakes.markers.delete(key);
    }),
}));
vi.mock("@/lib/actions/analytics/redis-cache", () => ({
    revalidateRedisAnalyticsCache: vi.fn(async () => {}),
}));

const { ensureCurrentAcademicYearLifecycle } = await import(
    "@/lib/services/academic-year-lifecycle"
);

async function readTerm(semester: number): Promise<{
    id: string;
    isCurrent: boolean;
    updatedAt: Date;
}> {
    return prisma.academicYear.findUniqueOrThrow({
        where: { year_semester: { year: LIFECYCLE_YEAR, semester } },
        select: { id: true, isCurrent: true, updatedAt: true },
    });
}

async function countTermRows(academicYearId: string): Promise<number> {
    return prisma.schoolClassTerm.count({ where: { academicYearId } });
}

describe("Integration: current-term lifecycle steady state and rollover", () => {
    let classId = "";
    let previousCurrentIds: string[] = [];

    beforeAll(async () => {
        previousCurrentIds = (
            await prisma.academicYear.findMany({
                where: { isCurrent: true },
                select: { id: true },
            })
        ).map((term) => term.id);

        // Stale dates on purpose: the first call must establish them once.
        const semesterOne = await createTestAcademicYear({
            year: LIFECYCLE_YEAR,
            semester: 1,
        });
        await prisma.academicYear.update({
            where: { id: semesterOne.id },
            data: { isCurrent: true },
        });

        const schoolId = (
            await createTestSchool({ name: "โรงเรียนสังเคราะห์วงจรเทอม" })
        ).id;
        const schoolClass = await prisma.schoolClass.create({
            data: { schoolId, name: "ม.2/1", expectedStudentCount: 28 },
        });
        classId = schoolClass.id;
        await prisma.schoolClassTerm.create({
            data: {
                schoolClassId: classId,
                academicYearId: semesterOne.id,
                expectedStudentCount: 28,
            },
        });

        vi.useFakeTimers({ toFake: ["Date"] });
    });

    beforeEach(() => {
        fakes.acquireRedisLock.mockClear();
    });

    afterAll(async () => {
        vi.useRealTimers();
        await prisma.academicYear
            .deleteMany({ where: { year: LIFECYCLE_YEAR, semester: 2 } })
            .catch(() => {});
        await prisma.academicYear
            .updateMany({ where: { year: LIFECYCLE_YEAR }, data: { isCurrent: false } })
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

    it("does not rewrite the current term or add class-term rows across repeated calls", async () => {
        vi.setSystemTime(STEADY_NOW);

        const established = await ensureCurrentAcademicYearLifecycle();
        const afterFirst = await readTerm(1);
        const rowsAfterFirst = await countTermRows(afterFirst.id);
        expect(established.id).toBe(afterFirst.id);
        expect(fakes.markers.get(STEADY_MARKER_KEY)).toBe(afterFirst.id);

        for (let call = 2; call <= 5; call += 1) {
            await expect(ensureCurrentAcademicYearLifecycle()).resolves.toEqual(
                expect.objectContaining({ id: afterFirst.id }),
            );
        }

        expect((await readTerm(1)).updatedAt).toEqual(afterFirst.updatedAt);
        expect(await countTermRows(afterFirst.id)).toBe(rowsAfterFirst);
        expect(fakes.acquireRedisLock).toHaveBeenCalledTimes(1);
    });

    it("keeps updatedAt when the marker has expired and the slow path finds an equal row", async () => {
        vi.setSystemTime(new Date(STEADY_NOW.getTime() + 61_000)); // past the memo
        fakes.markers.delete(STEADY_MARKER_KEY);
        const before = await readTerm(1);

        await ensureCurrentAcademicYearLifecycle();

        expect(fakes.acquireRedisLock).toHaveBeenCalledTimes(1);
        expect((await readTerm(1)).updatedAt).toEqual(before.updatedAt);
        expect(fakes.markers.get(STEADY_MARKER_KEY)).toBe(before.id);
    });

    it("provisions the new term on rollover, then serves it from the fast path", async () => {
        vi.setSystemTime(ROLLOVER_NOW);

        const record = await ensureCurrentAcademicYearLifecycle();

        const semesterTwo = await readTerm(2);
        expect(record.id).toBe(semesterTwo.id);
        expect(semesterTwo.isCurrent).toBe(true);
        expect((await readTerm(1)).isCurrent).toBe(false);
        await expect(
            prisma.schoolClassTerm.findUnique({
                where: {
                    schoolClassId_academicYearId: {
                        schoolClassId: classId,
                        academicYearId: semesterTwo.id,
                    },
                },
                select: { expectedStudentCount: true },
            }),
        ).resolves.toEqual({ expectedStudentCount: 28 });
        expect(fakes.markers.get(ROLLOVER_MARKER_KEY)).toBe(semesterTwo.id);
        const rowsAfterRollover = await countTermRows(semesterTwo.id);

        fakes.acquireRedisLock.mockClear();
        await ensureCurrentAcademicYearLifecycle();

        expect(fakes.acquireRedisLock).not.toHaveBeenCalled();
        expect((await readTerm(2)).updatedAt).toEqual(semesterTwo.updatedAt);
        expect(await countTermRows(semesterTwo.id)).toBe(rowsAfterRollover);
    });
});
