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
    logWarn: vi.fn(),
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
    logWarn: mocks.logWarn,
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

        it("deactivates the previous term and activates the current one in one transaction on rollover", async () => {
            mocks.findMany.mockResolvedValue([previousTerm]);

            await lifecycle.ensureCurrentAcademicYearLifecycle();

            expect(mocks.transaction).toHaveBeenCalledTimes(1);
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

        it("syncs stale term dates without touching other rows when no other term is current", async () => {
            mocks.findMany.mockResolvedValue([
                { ...currentTerm, endDate: new Date("2026-10-14T17:00:00.000Z") },
            ]);

            await lifecycle.ensureCurrentAcademicYearLifecycle();

            expect(mocks.upsert).toHaveBeenCalledTimes(1);
            expect(mocks.updateMany).not.toHaveBeenCalled();
            expect(mocks.transaction).not.toHaveBeenCalled();
        });

        it("reactivates an existing current-term row that is not marked current", async () => {
            mocks.findUnique.mockResolvedValue({ ...currentTerm, isCurrent: false });

            await lifecycle.ensureCurrentAcademicYearLifecycle();

            expect(mocks.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: expect.objectContaining({ isCurrent: true }),
                }),
            );
        });

        it("performs no term write when the current row already equals the clock", async () => {
            // Marker absent (e.g. expired): slow path, but the row is in sync.
            mocks.findMany.mockResolvedValue([currentTerm]);
            mocks.hasMissingSchoolClassTerms.mockResolvedValue(false);

            await expect(
                lifecycle.ensureCurrentAcademicYearLifecycle(),
            ).resolves.toEqual(currentTerm);

            expectNoWrites();
            expect(mocks.findUnique).not.toHaveBeenCalled();
            expect(mocks.acquireRedisLock).toHaveBeenCalledTimes(1);
            expect(mocks.writeRedisMarker).toHaveBeenCalledWith(
                MARKER_KEY,
                currentTerm.id,
                24 * 60 * 60,
            );
        });

        it("only clears the other current row when the current row is already in sync", async () => {
            mocks.findMany.mockResolvedValue([currentTerm, previousTerm]);

            await lifecycle.ensureCurrentAcademicYearLifecycle();

            expect(mocks.updateMany).toHaveBeenCalledTimes(1);
            expect(mocks.upsert).not.toHaveBeenCalled();
            expect(mocks.transaction).not.toHaveBeenCalled();
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

    describe("slow path while another request holds the lock", () => {
        beforeEach(() => {
            mocks.acquireRedisLock.mockResolvedValue({ status: "contended" });
        });

        it("waits for the lock holder's marker and then returns the record", async () => {
            mocks.readRedisMarker
                .mockResolvedValueOnce({ status: "absent" })
                .mockResolvedValueOnce({ status: "absent" })
                .mockResolvedValue({ status: "present", value: currentTerm.id });

            const pending = lifecycle.ensureCurrentAcademicYearLifecycle();
            await vi.advanceTimersByTimeAsync(1_000);

            await expect(pending).resolves.toEqual(currentTerm);
            expect(mocks.hasMissingSchoolClassTerms).toHaveBeenCalledTimes(1);
            expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
            expect(mocks.writeRedisMarker).not.toHaveBeenCalled();
            expect(mocks.releaseRedisLock).not.toHaveBeenCalled();
        });

        it("throws the existing error when terms are still missing after about 3 seconds", async () => {
            const pending = lifecycle.ensureCurrentAcademicYearLifecycle();
            const assertion = expect(pending).rejects.toThrow(
                "Academic year school class term provisioning is not complete",
            );

            await vi.advanceTimersByTimeAsync(2_900);
            expect(mocks.hasMissingSchoolClassTerms).toHaveBeenCalledTimes(1);
            await vi.advanceTimersByTimeAsync(200);

            await assertion;
            expect(mocks.hasMissingSchoolClassTerms).toHaveBeenCalledTimes(2);
            expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
            expect(mocks.revalidateRedisAnalyticsCache).not.toHaveBeenCalled();
            expect(mocks.releaseRedisLock).not.toHaveBeenCalled();
            expect(mocks.writeRedisMarker).not.toHaveBeenCalled();
        });

        it("returns once the rows exist at the deadline even if the marker never appeared", async () => {
            mocks.hasMissingSchoolClassTerms
                .mockResolvedValueOnce(true)
                .mockResolvedValue(false);

            const pending = lifecycle.ensureCurrentAcademicYearLifecycle();
            await vi.advanceTimersByTimeAsync(3_100);

            await expect(pending).resolves.toEqual(currentTerm);
            expect(mocks.writeRedisMarker).not.toHaveBeenCalled();
        });

        it("returns the record immediately without setting the marker when nothing is missing", async () => {
            mocks.findMany.mockResolvedValue([currentTerm]);
            mocks.hasMissingSchoolClassTerms.mockResolvedValue(false);

            await expect(
                lifecycle.ensureCurrentAcademicYearLifecycle(),
            ).resolves.toEqual(currentTerm);

            expect(mocks.readRedisMarker).toHaveBeenCalledTimes(1); // fast-path check only
            expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
            expect(mocks.releaseRedisLock).not.toHaveBeenCalled();
            expect(mocks.writeRedisMarker).not.toHaveBeenCalled();
            expectNoNextCacheInvalidation();
        });
    });

    describe("slow path when the lock service is unavailable", () => {
        beforeEach(() => {
            mocks.acquireRedisLock.mockResolvedValue({
                status: "unavailable",
                reason: "client_unavailable",
            });
        });

        it("serves the term when nothing is missing and warns only once", async () => {
            mocks.hasMissingSchoolClassTerms.mockResolvedValue(false);

            await expect(
                lifecycle.ensureCurrentAcademicYearLifecycle(),
            ).resolves.toEqual(currentTerm);
            await expect(
                lifecycle.ensureCurrentAcademicYearLifecycle(),
            ).resolves.toEqual(currentTerm);

            expect(mocks.logWarn).toHaveBeenCalledTimes(1);
            expect(mocks.logError).not.toHaveBeenCalled();
            expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
            expect(mocks.writeRedisMarker).not.toHaveBeenCalled();
            expectNoNextCacheInvalidation();
        });

        it("fails closed without provisioning when rows are missing", async () => {
            await expect(
                lifecycle.ensureCurrentAcademicYearLifecycle(),
            ).rejects.toThrow("Academic year lifecycle lock service is unavailable");

            expect(mocks.hasMissingSchoolClassTerms).toHaveBeenCalledWith(
                currentTerm.id,
            );
            expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
            expect(mocks.revalidateRedisAnalyticsCache).not.toHaveBeenCalled();
            expect(mocks.writeRedisMarker).not.toHaveBeenCalled();
            expect(mocks.logError).toHaveBeenCalledWith(
                "Academic year lifecycle lock unavailable:",
                expect.any(Error),
            );
            expectNoNextCacheInvalidation();
        });
    });
});

describe("provisionCurrentTermForReactivatedSchool", () => {
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

    it("provisions the reactivated school's current-term rows and keeps the marker", async () => {
        mocks.ensureSchoolClassTerms.mockResolvedValue(currentTerm.id);

        await lifecycle.provisionCurrentTermForReactivatedSchool("school-1");

        expect(mocks.ensureSchoolClassTerms).toHaveBeenCalledWith("school-1");
        expect(mocks.deleteRedisMarker).not.toHaveBeenCalled();
    });

    it("drops the marker instead of failing the school change when provisioning fails", async () => {
        mocks.ensureSchoolClassTerms.mockRejectedValue(new Error("db down"));

        await expect(
            lifecycle.provisionCurrentTermForReactivatedSchool("school-1"),
        ).resolves.toBeUndefined();

        expect(mocks.deleteRedisMarker).toHaveBeenCalledWith(MARKER_KEY);
        expect(mocks.logError).toHaveBeenCalledWith(
            "Reactivated school term provisioning error:",
            expect.any(Error),
        );
    });
});
