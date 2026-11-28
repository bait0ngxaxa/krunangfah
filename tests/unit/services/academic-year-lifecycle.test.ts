import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AcademicYear } from "@/types/teacher.types";

const mocks = vi.hoisted(() => ({
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findSchools: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    transaction: vi.fn(),
    logError: vi.fn(),
    ensureSchoolClassTerms: vi.fn(),
    hasMissingSchoolClassTerms: vi.fn(),
    revalidateRedisAnalyticsCache: vi.fn(),
    updateTag: vi.fn(),
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
    acquireRedisLock: vi.fn(),
    releaseRedisLock: vi.fn(),
    readRedisMarker: vi.fn(),
    writeRedisMarker: vi.fn(),
    deleteRedisMarker: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        academicYear: {
            findMany: mocks.findMany,
            findUnique: mocks.findUnique,
            updateMany: mocks.updateMany,
            upsert: mocks.upsert,
        },
        school: { findMany: mocks.findSchools },
        $transaction: mocks.transaction,
    },
}));

vi.mock("@/lib/utils/logging", () => ({
    logError: mocks.logError,
}));

vi.mock("@/lib/services/school-class-term-service", () => ({
    ensureSchoolClassTermsForAcademicYear: mocks.ensureSchoolClassTerms,
    hasMissingSchoolClassTermsForAcademicYear: mocks.hasMissingSchoolClassTerms,
}));

vi.mock("@/lib/actions/analytics/redis-cache", () => ({
    revalidateRedisAnalyticsCache: mocks.revalidateRedisAnalyticsCache,
}));

// Lifecycle runs during render and before cache fills, where Next.js forbids
// tag/path invalidation; any call here is a regression.
vi.mock("next/cache", () => ({
    updateTag: mocks.updateTag,
    revalidateTag: mocks.revalidateTag,
    revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/cache/redis-lock", () => ({
    acquireRedisLock: mocks.acquireRedisLock,
    releaseRedisLock: mocks.releaseRedisLock,
}));

vi.mock("@/lib/cache/redis-marker", () => ({
    readRedisMarker: mocks.readRedisMarker,
    writeRedisMarker: mocks.writeRedisMarker,
    deleteRedisMarker: mocks.deleteRedisMarker,
}));

type LifecycleModule = typeof import("@/lib/services/academic-year-lifecycle");

const LOCK = { key: "lock:academic-year-lifecycle:2569:1", token: "token-1" };
const MARKER_KEY = "academic-year-lifecycle:provisioned:2569:1";

// 12 May 2026 is semester 1 of 2569: 1 May to 31 Oct at Bangkok midnight.
const currentTerm: AcademicYear = {
    id: "ay-2569-1",
    year: 2569,
    semester: 1,
    startDate: new Date("2026-04-30T17:00:00.000Z"),
    endDate: new Date("2026-10-30T17:00:00.000Z"),
    isCurrent: true,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
};
const previousTerm: AcademicYear = {
    ...currentTerm,
    id: "ay-2568-2",
    year: 2568,
    semester: 2,
    startDate: new Date("2025-10-31T17:00:00.000Z"),
    endDate: new Date("2026-04-29T17:00:00.000Z"),
};

let lifecycle: LifecycleModule;

function expectNoWrites(): void {
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
}

function expectNoNextCacheInvalidation(): void {
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
}

function givenSteadyTerm(): void {
    mocks.findMany.mockResolvedValue([currentTerm]);
    mocks.readRedisMarker.mockResolvedValue({
        status: "present",
        value: currentTerm.id,
    });
}

describe("ensureCurrentAcademicYearLifecycle", () => {
    beforeEach(async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 4, 12));
        vi.resetAllMocks();
        // Fresh module per test so the in-process memo never leaks between tests.
        vi.resetModules();
        lifecycle = await import("@/lib/services/academic-year-lifecycle");

        mocks.findMany.mockResolvedValue([]);
        mocks.findUnique.mockResolvedValue(null);
        mocks.updateMany.mockResolvedValue({ count: 1 });
        mocks.upsert.mockResolvedValue(currentTerm);
        mocks.transaction.mockImplementation(
            async (operations: Promise<unknown>[]): Promise<unknown[]> =>
                Promise.all(operations),
        );
        mocks.findSchools.mockResolvedValue([
            { id: "school-1" },
            { id: "school-2" },
        ]);
        mocks.ensureSchoolClassTerms.mockResolvedValue(currentTerm.id);
        mocks.hasMissingSchoolClassTerms.mockResolvedValue(true);
        mocks.revalidateRedisAnalyticsCache.mockResolvedValue(undefined);
        mocks.acquireRedisLock.mockResolvedValue({ status: "acquired", lock: LOCK });
        mocks.releaseRedisLock.mockResolvedValue(undefined);
        mocks.readRedisMarker.mockResolvedValue({ status: "absent" });
        mocks.writeRedisMarker.mockResolvedValue(true);
        mocks.deleteRedisMarker.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("fast path", () => {
        it("returns the provisioned current term without writes, locks or anti-joins", async () => {
            givenSteadyTerm();

            await expect(
                lifecycle.ensureCurrentAcademicYearLifecycle(),
            ).resolves.toEqual(currentTerm);

            expect(mocks.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { isCurrent: true }, take: 2 }),
            );
            expect(mocks.readRedisMarker).toHaveBeenCalledWith(MARKER_KEY);
            expectNoWrites();
            expect(mocks.acquireRedisLock).not.toHaveBeenCalled();
            expect(mocks.hasMissingSchoolClassTerms).not.toHaveBeenCalled();
            expect(mocks.writeRedisMarker).not.toHaveBeenCalled();
            expectNoNextCacheInvalidation();
        });

        it("skips the Redis read for 60 seconds after confirming the marker", async () => {
            givenSteadyTerm();

            await lifecycle.ensureCurrentAcademicYearLifecycle();
            vi.advanceTimersByTime(59_000);
            await lifecycle.ensureCurrentAcademicYearLifecycle();
            expect(mocks.readRedisMarker).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(2_000);
            await lifecycle.ensureCurrentAcademicYearLifecycle();
            expect(mocks.readRedisMarker).toHaveBeenCalledTimes(2);
            expectNoWrites();
        });

        it("does not trust a marker written for a different row of the same term", async () => {
            mocks.findMany.mockResolvedValue([currentTerm]);
            mocks.readRedisMarker.mockResolvedValue({
                status: "present",
                value: "ay-recreated",
            });

            await lifecycle.ensureCurrentAcademicYearLifecycle();

            expect(mocks.acquireRedisLock).toHaveBeenCalledTimes(1);
            expect(mocks.hasMissingSchoolClassTerms).toHaveBeenCalledWith(
                currentTerm.id,
            );
        });

        it.each([
            ["no current row", []],
            ["two current rows", [currentTerm, previousTerm]],
            [
                "a different start date",
                [{ ...currentTerm, startDate: new Date("2026-05-14T17:00:00.000Z") }],
            ],
            [
                "a different end date",
                [{ ...currentTerm, endDate: new Date("2026-10-14T17:00:00.000Z") }],
            ],
            ["a different term (rollover)", [previousTerm]],
        ])("takes the slow path when there is %s", async (_case, rows) => {
            mocks.findMany.mockResolvedValue(rows);
            mocks.readRedisMarker.mockResolvedValue({
                status: "present",
                value: currentTerm.id,
            });

            await expect(
                lifecycle.ensureCurrentAcademicYearLifecycle(),
            ).resolves.toEqual(currentTerm);

            expect(mocks.acquireRedisLock).toHaveBeenCalledWith(
                LOCK.key,
                expect.any(Number),
            );
            expect(mocks.hasMissingSchoolClassTerms).toHaveBeenCalledTimes(1);
        });

        it("takes the slow path when the marker is absent", async () => {
            mocks.findMany.mockResolvedValue([currentTerm]);

            await lifecycle.ensureCurrentAcademicYearLifecycle();

            expect(mocks.acquireRedisLock).toHaveBeenCalledTimes(1);
        });
    });

    describe("slow path with the lock acquired", () => {
        it("auto-creates only the current semester when entering a new academic year", async () => {
            await lifecycle.ensureCurrentAcademicYearLifecycle();

            expect(mocks.upsert).toHaveBeenCalledTimes(1);
            expect(mocks.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        year: 2569,
                        semester: 1,
                        isCurrent: true,
                    }),
                }),
            );
        });

        it("syncs the current term dates while activating the current semester", async () => {
            await lifecycle.ensureCurrentAcademicYearLifecycle();

            expect(mocks.updateMany).toHaveBeenCalledWith({
                where: {
                    isCurrent: true,
                    NOT: { year: 2569, semester: 1 },
                },
                data: { isCurrent: false },
            });
            expect(mocks.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: {
                        // 1 May and 31 Oct 2026 at Bangkok midnight (UTC+07:00).
                        startDate: new Date("2026-04-30T17:00:00.000Z"),
                        endDate: new Date("2026-10-30T17:00:00.000Z"),
                        isCurrent: true,
                    },
                }),
            );
        });

        it("provisions every active school, invalidates Redis once, sets the marker, then releases the lock", async () => {
            await lifecycle.ensureCurrentAcademicYearLifecycle();

            expect(mocks.ensureSchoolClassTerms).toHaveBeenCalledTimes(2);
            expect(mocks.ensureSchoolClassTerms).toHaveBeenCalledWith(
                "school-1",
                currentTerm.id,
            );
            expect(mocks.ensureSchoolClassTerms).toHaveBeenCalledWith(
                "school-2",
                currentTerm.id,
            );
            expect(mocks.revalidateRedisAnalyticsCache).toHaveBeenCalledTimes(1);
            expect(mocks.writeRedisMarker).toHaveBeenCalledWith(
                MARKER_KEY,
                currentTerm.id,
                24 * 60 * 60,
            );
            expect(mocks.releaseRedisLock).toHaveBeenCalledWith(LOCK);
            expect(
                mocks.writeRedisMarker.mock.invocationCallOrder[0],
            ).toBeLessThan(mocks.releaseRedisLock.mock.invocationCallOrder[0] ?? 0);
            expectNoNextCacheInvalidation();
        });

        it("sets the marker without provisioning or invalidating when nothing is missing", async () => {
            mocks.hasMissingSchoolClassTerms.mockResolvedValue(false);

            await lifecycle.ensureCurrentAcademicYearLifecycle();

            expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
            expect(mocks.revalidateRedisAnalyticsCache).not.toHaveBeenCalled();
            expect(mocks.writeRedisMarker).toHaveBeenCalledWith(
                MARKER_KEY,
                currentTerm.id,
                24 * 60 * 60,
            );
            expect(mocks.releaseRedisLock).toHaveBeenCalledWith(LOCK);
        });

        it("takes the fast path on the next call after provisioning", async () => {
            await lifecycle.ensureCurrentAcademicYearLifecycle();
            vi.resetAllMocks();
            mocks.findMany.mockResolvedValue([currentTerm]);

            await lifecycle.ensureCurrentAcademicYearLifecycle();

            expect(mocks.readRedisMarker).not.toHaveBeenCalled();
            expect(mocks.acquireRedisLock).not.toHaveBeenCalled();
            expectNoWrites();
        });

        it("limits concurrent school preparation to one batch of ten", async () => {
            mocks.findSchools.mockResolvedValue(
                Array.from({ length: 11 }, (_, index) => ({
                    id: `school-${index + 1}`,
                })),
            );
            let active = 0;
            let maxConcurrent = 0;
            mocks.ensureSchoolClassTerms.mockImplementation(async () => {
                active += 1;
                maxConcurrent = Math.max(maxConcurrent, active);
                await Promise.resolve();
                active -= 1;
                return currentTerm.id;
            });

            await lifecycle.ensureCurrentAcademicYearLifecycle();

            expect(mocks.ensureSchoolClassTerms).toHaveBeenCalledTimes(11);
            expect(maxConcurrent).toBe(10);
        });

        it("releases the lock and sets no marker when school preparation fails", async () => {
            mocks.ensureSchoolClassTerms.mockRejectedValue(
                new Error("school preparation unavailable"),
            );

            await expect(
                lifecycle.ensureCurrentAcademicYearLifecycle(),
            ).rejects.toThrow("school preparation unavailable");

            expect(mocks.releaseRedisLock).toHaveBeenCalledWith(LOCK);
            expect(mocks.writeRedisMarker).not.toHaveBeenCalled();
        });

        it("retries provisioning on the next request after the first attempt fails", async () => {
            mocks.findSchools.mockResolvedValue([{ id: "school-1" }]);
            mocks.ensureSchoolClassTerms
                .mockRejectedValueOnce(new Error("school preparation unavailable"))
                .mockResolvedValue(currentTerm.id);

            await expect(
                lifecycle.ensureCurrentAcademicYearLifecycle(),
            ).rejects.toThrow();
            await expect(
                lifecycle.ensureCurrentAcademicYearLifecycle(),
            ).resolves.toEqual(currentTerm);

            expect(mocks.ensureSchoolClassTerms).toHaveBeenCalledTimes(2);
            expect(mocks.releaseRedisLock).toHaveBeenCalledTimes(2);
            expect(mocks.revalidateRedisAnalyticsCache).toHaveBeenCalledTimes(1);
        });
    });

    describe("slow path without the lock", () => {
        it("does not report success while terms are missing and another request holds the lock", async () => {
            mocks.acquireRedisLock.mockResolvedValue({ status: "contended" });

            await expect(
                lifecycle.ensureCurrentAcademicYearLifecycle(),
            ).rejects.toThrow(
                "Academic year school class term provisioning is not complete",
            );

            expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
            expect(mocks.revalidateRedisAnalyticsCache).not.toHaveBeenCalled();
            expect(mocks.releaseRedisLock).not.toHaveBeenCalled();
            expect(mocks.writeRedisMarker).not.toHaveBeenCalled();
        });

        it("returns the record without setting the marker when another request holds the lock and nothing is missing", async () => {
            mocks.acquireRedisLock.mockResolvedValue({ status: "contended" });
            mocks.hasMissingSchoolClassTerms.mockResolvedValue(false);

            await expect(
                lifecycle.ensureCurrentAcademicYearLifecycle(),
            ).resolves.toEqual(currentTerm);

            expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
            expect(mocks.releaseRedisLock).not.toHaveBeenCalled();
            expect(mocks.writeRedisMarker).not.toHaveBeenCalled();
        });

        it("fails closed when the lifecycle lock service is unavailable", async () => {
            mocks.acquireRedisLock.mockResolvedValue({
                status: "unavailable",
                reason: "client_unavailable",
            });

            await expect(
                lifecycle.ensureCurrentAcademicYearLifecycle(),
            ).rejects.toThrow("Academic year lifecycle lock service is unavailable");

            expect(mocks.hasMissingSchoolClassTerms).not.toHaveBeenCalled();
            expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
            expect(mocks.revalidateRedisAnalyticsCache).not.toHaveBeenCalled();
            expect(mocks.writeRedisMarker).not.toHaveBeenCalled();
            expectNoNextCacheInvalidation();
        });
    });
});

describe("provisionCurrentTermForRestoredSchool", () => {
    beforeEach(async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 4, 12));
        vi.resetAllMocks();
        vi.resetModules();
        lifecycle = await import("@/lib/services/academic-year-lifecycle");
        mocks.deleteRedisMarker.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("provisions the restored school's current-term rows and keeps the marker", async () => {
        mocks.ensureSchoolClassTerms.mockResolvedValue(currentTerm.id);

        await lifecycle.provisionCurrentTermForRestoredSchool("school-1");

        expect(mocks.ensureSchoolClassTerms).toHaveBeenCalledWith("school-1");
        expect(mocks.deleteRedisMarker).not.toHaveBeenCalled();
    });

    it("drops the marker instead of failing the restore when provisioning fails", async () => {
        mocks.ensureSchoolClassTerms.mockRejectedValue(new Error("db down"));

        await expect(
            lifecycle.provisionCurrentTermForRestoredSchool("school-1"),
        ).resolves.toBeUndefined();

        expect(mocks.deleteRedisMarker).toHaveBeenCalledWith(MARKER_KEY);
        expect(mocks.logError).toHaveBeenCalledWith(
            "Restored school term provisioning error:",
            expect.any(Error),
        );
    });
});
