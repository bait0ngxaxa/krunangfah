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

vi.mock("@/lib/actions/school-setup.actions", () => ({
    ensureSchoolClassTermsForAcademicYear: mocks.ensureSchoolClassTerms,
}));

vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: mocks.revalidateAnalyticsCache,
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

    it("clears stale current flags before activating the current semester", async () => {
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
                update: { isCurrent: true },
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
});
