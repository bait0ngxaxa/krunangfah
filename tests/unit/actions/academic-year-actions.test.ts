import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    getAcademicYears,
    getCurrentAcademicYearTerms,
    getCurrentAcademicYearRecord,
} from "@/lib/actions/academic-year.actions";

// Lifecycle behavior (fast path, provisioning, locks) is covered in
// tests/unit/services/academic-year-lifecycle.test.ts; these tests cover how
// the actions call it and map its outcome to a QueryResult.
const mocks = vi.hoisted(() => ({
    findMany: vi.fn(),
    requireAuth: vi.fn(),
    logError: vi.fn(),
    ensureLifecycle: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        academicYear: { findMany: mocks.findMany },
    },
}));

vi.mock("@/lib/auth/session", () => ({
    requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/utils/logging", () => ({
    logError: mocks.logError,
}));

vi.mock("@/lib/services/academic-year-lifecycle", () => ({
    ensureCurrentAcademicYearLifecycle: mocks.ensureLifecycle,
}));

const currentTerm = {
    id: "ay-2569-1",
    year: 2569,
    semester: 1,
    startDate: new Date("2026-04-30T17:00:00.000Z"),
    endDate: new Date("2026-10-30T17:00:00.000Z"),
    isCurrent: true,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
};

describe("academic-year.actions", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(2026, 4, 12));
        vi.resetAllMocks();

        mocks.requireAuth.mockResolvedValue({ user: { id: "user-1" } });
        mocks.ensureLifecycle.mockResolvedValue(currentTerm);
        mocks.findMany.mockResolvedValue([]);
    });

    it("runs the current-term lifecycle before listing academic years", async () => {
        await getAcademicYears();

        expect(mocks.ensureLifecycle).toHaveBeenCalledTimes(1);
        expect(mocks.ensureLifecycle.mock.invocationCallOrder[0]).toBeLessThan(
            mocks.findMany.mock.invocationCallOrder[0] ?? 0,
        );
    });

    it("returns the lifecycle's current term record", async () => {
        await expect(getCurrentAcademicYearRecord()).resolves.toEqual({
            status: "success",
            data: currentTerm,
        });
    });

    it("returns every academic year for filters and history views", async () => {
        await getAcademicYears();

        expect(mocks.findMany).toHaveBeenCalledWith({
            orderBy: [{ year: "desc" }, { semester: "desc" }],
        });
    });

    it("returns only terms from the current academic year for current workflows", async () => {
        await getCurrentAcademicYearTerms();

        expect(mocks.ensureLifecycle).toHaveBeenCalledTimes(1);
        expect(mocks.findMany).toHaveBeenCalledWith({
            where: { year: 2569 },
            orderBy: [{ year: "desc" }, { semester: "desc" }],
        });
    });

    it("returns success when academic years exist and empty only for a real empty query", async () => {
        mocks.findMany.mockResolvedValueOnce([currentTerm]);

        await expect(getAcademicYears()).resolves.toEqual({
            status: "success",
            data: [currentTerm],
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
        mocks.ensureLifecycle.mockRejectedValue(
            new Error("Academic year school class term provisioning is not complete"),
        );

        const record = await getCurrentAcademicYearRecord();
        const terms = await getCurrentAcademicYearTerms();

        expect(record.status).toBe("transient_error");
        expect(record).not.toHaveProperty("data");
        expect(terms.status).toBe("transient_error");
        expect(mocks.findMany).not.toHaveBeenCalled();
    });
});
