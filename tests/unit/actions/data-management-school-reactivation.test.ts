import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A school re-entering the provisioning set (restored, or unmarked as test
// data) must get its current-term class rows at once, because the lifecycle's
// provisioned marker would otherwise hide them for up to 24 h. The real
// reactivation helper runs here; only its database and Redis edges are mocked.

const prismaMocks = vi.hoisted(() => {
    const tx = {
        school: { findUnique: vi.fn(), update: vi.fn() },
        dataManagementEvent: { create: vi.fn() },
    };
    return { transaction: vi.fn(), tx };
});

const mocks = vi.hoisted(() => ({
    ensureSchoolClassTerms: vi.fn(),
    deleteRedisMarker: vi.fn(),
    revalidateAnalyticsCache: vi.fn(),
    logError: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: { $transaction: prismaMocks.transaction },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/actions/analytics/cache", () => ({
    revalidateAnalyticsCache: mocks.revalidateAnalyticsCache,
}));
vi.mock("@/lib/actions/dashboard/cache", () => ({
    revalidateDashboardCache: vi.fn(),
}));
vi.mock("@/lib/actions/student/cache", () => ({
    revalidateStudentsCache: vi.fn(),
}));
vi.mock("@/lib/auth/session-store", () => ({
    invalidateUserSessionCaches: vi.fn(),
}));
vi.mock("@/lib/actions/data-management/preview", () => ({
    getSchoolImpact: vi.fn(),
    getStudentImpact: vi.fn(),
}));
vi.mock("@/lib/services/school-class-term-service", () => ({
    ensureSchoolClassTermsForAcademicYear: mocks.ensureSchoolClassTerms,
    hasMissingSchoolClassTermsForAcademicYear: vi.fn(),
}));
vi.mock("@/lib/cache/redis-marker", () => ({
    readRedisMarker: vi.fn(),
    writeRedisMarker: vi.fn(),
    deleteRedisMarker: mocks.deleteRedisMarker,
}));
vi.mock("@/lib/utils/logging", () => ({
    logError: mocks.logError,
    logWarn: vi.fn(),
}));

import {
    markSchoolAsTestData,
    restoreSchool,
    unmarkSchoolTestData,
} from "@/lib/actions/data-management/mutations";
import { getSchoolImpact } from "@/lib/actions/data-management/preview";
import type { ImpactSummary } from "@/lib/actions/data-management/types";

const SCHOOL_ID = "cmtarget000000000000001";
// 12 May 2026 (Bangkok) is term 2569/1.
const MARKER_KEY = "academic-year-lifecycle:provisioned:2569:1";

const input = {
    id: SCHOOL_ID,
    reason: "ตรวจสอบข้อมูลผิด",
    actor: {
        id: "cmadmin00000000000000001",
        email: "admin@example.com",
        name: "ผู้ดูแลระบบ",
        role: "system_admin",
    },
};

const impact: ImpactSummary = {
    userCount: 0,
    studentCount: 0,
    activeStudentCount: 0,
    phqResultCount: 0,
    activityProgressCount: 0,
    counselingSessionCount: 0,
    homeVisitCount: 0,
    worksheetUploadCount: 0,
    homeVisitPhotoCount: 0,
    studentReferralCount: 0,
    pendingTeacherInviteCount: 0,
    pendingSchoolAdminInviteCount: 0,
    fileCount: 0,
};

function givenSchool(state: { disabledAt: Date | null; isTestData: boolean }): void {
    prismaMocks.tx.school.findUnique.mockResolvedValue({
        id: SCHOOL_ID,
        name: "โรงเรียนสังเคราะห์",
        province: "เชียงใหม่",
        ...state,
    });
}

function provisionedBeforeCacheInvalidation(): boolean {
    const provisionedAt = mocks.ensureSchoolClassTerms.mock.invocationCallOrder[0];
    const invalidatedAt = mocks.revalidateAnalyticsCache.mock.invocationCallOrder[0];
    return (
        provisionedAt !== undefined &&
        invalidatedAt !== undefined &&
        provisionedAt < invalidatedAt
    );
}

describe("school reactivation provisions current-term class rows", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(2026, 4, 12));
        vi.resetAllMocks();
        prismaMocks.transaction.mockImplementation(
            async (callback: (tx: typeof prismaMocks.tx) => Promise<unknown>) =>
                callback(prismaMocks.tx),
        );
        prismaMocks.tx.dataManagementEvent.create.mockResolvedValue({ id: "event-1" });
        vi.mocked(getSchoolImpact).mockResolvedValue(impact);
        mocks.ensureSchoolClassTerms.mockResolvedValue("ay-2569-1");
        mocks.deleteRedisMarker.mockResolvedValue(undefined);
        mocks.revalidateAnalyticsCache.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("provisions a restored school before invalidating caches", async () => {
        givenSchool({ disabledAt: new Date("2026-04-01T00:00:00.000Z"), isTestData: false });

        const result = await restoreSchool(input);

        expect(result).toEqual({ success: true, message: "กู้คืนโรงเรียนสำเร็จ" });
        expect(mocks.ensureSchoolClassTerms).toHaveBeenCalledWith(SCHOOL_ID);
        expect(provisionedBeforeCacheInvalidation()).toBe(true);
        expect(mocks.deleteRedisMarker).not.toHaveBeenCalled();
    });

    it("does not provision when restore school is rejected", async () => {
        prismaMocks.tx.school.findUnique.mockResolvedValue(null);

        const result = await restoreSchool(input);

        expect(result).toEqual({ success: false, message: "ไม่พบโรงเรียน" });
        expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
    });

    it("provisions a school unmarked as test data before invalidating caches", async () => {
        givenSchool({ disabledAt: null, isTestData: true });

        const result = await unmarkSchoolTestData(input);

        expect(result).toEqual({ success: true, message: "ยกเลิกข้อมูลทดสอบสำเร็จ" });
        expect(mocks.ensureSchoolClassTerms).toHaveBeenCalledWith(SCHOOL_ID);
        expect(provisionedBeforeCacheInvalidation()).toBe(true);
        expect(mocks.deleteRedisMarker).not.toHaveBeenCalled();
    });

    it("does not provision when a school is marked as test data", async () => {
        givenSchool({ disabledAt: null, isTestData: false });

        const result = await markSchoolAsTestData(input);

        expect(result).toEqual({ success: true, message: "ตั้งเป็นข้อมูลทดสอบสำเร็จ" });
        expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
        expect(mocks.deleteRedisMarker).not.toHaveBeenCalled();
    });

    it("does not provision when unmark is rejected", async () => {
        givenSchool({ disabledAt: null, isTestData: false });

        const result = await unmarkSchoolTestData(input);

        expect(result).toEqual({ success: false, message: "โรงเรียนนี้ไม่ได้เป็นข้อมูลทดสอบ" });
        expect(mocks.ensureSchoolClassTerms).not.toHaveBeenCalled();
    });

    it.each([
        ["unmark", unmarkSchoolTestData, { disabledAt: null, isTestData: true }, "ยกเลิกข้อมูลทดสอบสำเร็จ"],
        ["restore", restoreSchool, { disabledAt: new Date("2026-04-01T00:00:00.000Z"), isTestData: false }, "กู้คืนโรงเรียนสำเร็จ"],
    ] as const)(
        "keeps the %s successful and forgets the marker when provisioning fails",
        async (_name, action, state, message) => {
            givenSchool(state);
            mocks.ensureSchoolClassTerms.mockRejectedValue(new Error("db down"));

            const result = await action(input);

            expect(result).toEqual({ success: true, message });
            expect(mocks.deleteRedisMarker).toHaveBeenCalledWith(MARKER_KEY);
            expect(mocks.logError).toHaveBeenCalledWith(
                "Reactivated school term provisioning error:",
                expect.any(Error),
            );
            expect(mocks.revalidateAnalyticsCache).toHaveBeenCalledWith(SCHOOL_ID);
        },
    );
});
