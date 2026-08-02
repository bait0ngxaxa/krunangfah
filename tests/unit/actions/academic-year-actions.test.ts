import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    getAcademicYears,
    getCurrentAcademicYearTerms,
    getCurrentAcademicYearRecord,
} from "@/lib/actions/academic-year.actions";

const mocks = vi.hoisted(() => ({
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findSchools: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    transaction: vi.fn(),
    requireAuth: vi.fn(),
    logError: vi.fn(),
    ensureSchoolClassTerms: vi.fn(),
    revalidateAnalyticsCache: vi.fn(),
    acquireRedisLock: vi.fn(),
    releaseRedisLock: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        academicYear: {
            findMany: mocks.findMany,
            findFirst: mocks.findFirst,
            updateMany: mocks.updateMany,
            upsert: mocks.upsert,
        },
        school: { findMany: mocks.findSchools },
        $transaction: mocks.transaction,
    },
}));

vi.mock("@/lib/auth/session", () => ({
    requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/utils/logging", () => ({
    logError: mocks.logError,
}));

vi.mock("@/lib/services/school-class-term-service", () => ({
    ensureSchoolClassTermsForAcademicYear: mocks.ensureSchoolClassTerms,
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: mocks.revalidateAnalyticsCache,
}));

vi.mock("@/lib/cache/redis-lock", () => ({
    acquireRedisLock: mocks.acquireRedisLock,
    releaseRedisLock: mocks.releaseRedisLock,
}));

describe("academic-year.actions", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 4, 12));
        vi.resetAllMocks();

        mocks.requireAuth.mockResolvedValue({ user: { id: "user-1" } });
        mocks.updateMany.mockResolvedValue({ count: 1 });
        mocks.upsert.mockResolvedValue({
            id: "ay-2569-1",
            year: 2569,
            semester: 1,
            startDate: new Date(2026, 4, 15),
            endDate: new Date(2026, 9, 15),
            isCurrent: true,
            createdAt: new Date(2026, 4, 12),
            updatedAt: new Date(2026, 4, 12),
        });
        mocks.findMany.mockResolvedValue([]);
        mocks.findFirst.mockResolvedValue({
            id: "ay-2568-2",
            year: 2568,
            semester: 2,
        });
        mocks.findSchools.mockResolvedValue([
            { id: "school-1" },
            { id: "school-2" },
        ]);
        mocks.ensureSchoolClassTerms.mockResolvedValue("ay-2569-1");
        mocks.revalidateAnalyticsCache.mockResolvedValue(undefined);
        mocks.acquireRedisLock.mockResolvedValue({
            key: "lock:academic-year-lifecycle:2569:1",
            token: "token-1",
        });
        mocks.releaseRedisLock.mockResolvedValue(undefined);
        mocks.transaction.mockImplementation(
            async (operations: Promise<unknown>[]): Promise<unknown[]> =>
                Promise.all(operations),
        );
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("auto-creates only the current semester when entering a new academic year", async () => {
        await getAcademicYears();

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
        await getCurrentAcademicYearRecord();

        expect(mocks.updateMany).toHaveBeenCalledWith({
            where: {
                isCurrent: true,
                NOT: {
                    year: 2569,
                    semester: 1,
                },
            },
            data: { isCurrent: false },
        });
        expect(mocks.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                update: {
                    startDate: new Date(2026, 4, 15),
                    endDate: new Date(2026, 9, 15),
                    isCurrent: true,
                },
            }),
        );
    });

    it("prepares every active school and invalidates analytics when the term changes", async () => {
        await getCurrentAcademicYearRecord();

        expect(mocks.ensureSchoolClassTerms).toHaveBeenCalledTimes(2);
        expect(mocks.ensureSchoolClassTerms).toHaveBeenCalledWith(
            "school-1",
            "ay-2569-1",
        );
        expect(mocks.ensureSchoolClassTerms).toHaveBeenCalledWith(
            "school-2",
            "ay-2569-1",
        );
        expect(mocks.revalidateAnalyticsCache).toHaveBeenCalledTimes(1);
        expect(mocks.acquireRedisLock).toHaveBeenCalledWith(
            "lock:academic-year-lifecycle:2569:1",
            expect.any(Number),
        );
        expect(mocks.releaseRedisLock).toHaveBeenCalledWith({
            key: "lock:academic-year-lifecycle:2569:1",
            token: "token-1",
        });
    });

    it("skips term preparation when another lifecycle request holds the lock", async () => {
        mocks.acquireRedisLock.mockResolvedValue(null);

        await getCurrentAcademicYearRecord();

        expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
        expect(mocks.revalidateAnalyticsCache).not.toHaveBeenCalled();
        expect(mocks.releaseRedisLock).not.toHaveBeenCalled();
    });

    it("limits concurrent school preparation to one batch of ten", async () => {
        mocks.findSchools.mockResolvedValue(
            Array.from({ length: 11 }, (_, index) => ({
                id: `school-${index + 1}`,
            })),
        );

        let activePreparations = 0;
        let maxConcurrentPreparations = 0;
        mocks.ensureSchoolClassTerms.mockImplementation(async () => {
            activePreparations += 1;
            maxConcurrentPreparations = Math.max(
                maxConcurrentPreparations,
                activePreparations,
            );
            await Promise.resolve();
            activePreparations -= 1;
            return "ay-2569-1";
        });

        await getCurrentAcademicYearRecord();

        expect(mocks.ensureSchoolClassTerms).toHaveBeenCalledTimes(11);
        expect(maxConcurrentPreparations).toBe(10);
    });

    it("releases the lifecycle lock when school preparation fails", async () => {
        mocks.ensureSchoolClassTerms.mockRejectedValue(
            new Error("school preparation unavailable"),
        );

        const result = await getCurrentAcademicYearRecord();

        expect(result.status).toBe("transient_error");
        expect(mocks.releaseRedisLock).toHaveBeenCalledWith({
            key: "lock:academic-year-lifecycle:2569:1",
            token: "token-1",
        });
    });

    it("does not rebuild terms or invalidate analytics when the current term is unchanged", async () => {
        mocks.findFirst.mockResolvedValue({ year: 2569, semester: 1 });

        await getCurrentAcademicYearRecord();

        expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
        expect(mocks.revalidateAnalyticsCache).not.toHaveBeenCalled();
    });

    it("returns every academic year for filters and history views", async () => {
        await getAcademicYears();

        expect(mocks.findMany).toHaveBeenCalledWith({
            orderBy: [{ year: "desc" }, { semester: "desc" }],
        });
    });

    it("returns only terms from the current academic year for current workflows", async () => {
        await getCurrentAcademicYearTerms();

        expect(mocks.findMany).toHaveBeenCalledWith({
            where: { year: 2569 },
            orderBy: [{ year: "desc" }, { semester: "desc" }],
        });
    });

    it("returns success when academic years exist and empty only for a real empty query", async () => {
        const academicYear = {
            id: "ay-2569-1",
            year: 2569,
            semester: 1,
            startDate: new Date(2026, 4, 15),
            endDate: new Date(2026, 9, 15),
            isCurrent: true,
            createdAt: new Date(2026, 4, 12),
            updatedAt: new Date(2026, 4, 12),
        };
        mocks.findMany.mockResolvedValueOnce([academicYear]);

        await expect(getAcademicYears()).resolves.toEqual({
            status: "success",
            data: [academicYear],
        });

        mocks.findMany.mockResolvedValueOnce([]);
        await expect(getAcademicYears()).resolves.toEqual({
            status: "empty",
            data: [],
        });
    });

    it("returns transient_error instead of an empty academic-year list on database failure", async () => {
        mocks.findMany.mockRejectedValue(new Error("database unavailable"));

        const result = await getAcademicYears();

        expect(result).toEqual({
            status: "transient_error",
            requestId: expect.any(String),
            message: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        });
        expect(result).not.toHaveProperty("data");
        expect(mocks.logError).toHaveBeenCalledWith(
            expect.stringMatching(/Get academic years error: \[requestId=.+\]/),
            expect.any(Error),
        );
    });

    it("returns transient_error when current-term lifecycle resolution fails", async () => {
        mocks.upsert.mockRejectedValue(new Error("lifecycle unavailable"));

        const result = await getCurrentAcademicYearRecord();

        expect(result.status).toBe("transient_error");
        expect(result).not.toHaveProperty("data");
    });
});
