import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    getAcademicYears,
    getCurrentAcademicYearTerms,
    getCurrentAcademicYearRecord,
} from "@/lib/actions/academic-year.actions";

const mocks = vi.hoisted(() => ({
    findMany: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    transaction: vi.fn(),
    requireAuth: vi.fn(),
    logError: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        academicYear: {
            findMany: mocks.findMany,
            updateMany: mocks.updateMany,
            upsert: mocks.upsert,
        },
        $transaction: mocks.transaction,
    },
}));

vi.mock("@/lib/auth/session", () => ({
    requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/utils/logging", () => ({
    logError: mocks.logError,
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
