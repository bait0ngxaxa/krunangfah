import { beforeEach, describe, expect, it, vi } from "vitest";

const CURRENT_TERM = {
    id: "ay-2569-2",
    year: 2569,
    semester: 2,
    isCurrent: true,
};

const mocks = vi.hoisted(() => ({
    getViewerContext: vi.fn(),
    lifecycle: vi.fn(),
    readAnalytics: vi.fn(),
    readOverview: vi.fn(),
    fetchAnalyticsData: vi.fn(),
    fetchSystemAnalyticsOverview: vi.fn(),
    unstableCacheKeys: [] as string[][],
    lifecycleCallsDuringCacheFill: [] as number[],
}));

vi.mock("@/lib/auth/viewer-context", () => ({
    getViewerContext: mocks.getViewerContext,
}));
vi.mock("@/lib/database/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/utils/logging", () => ({ logError: vi.fn() }));
vi.mock("@/lib/services/academic-year-lifecycle", () => ({
    ensureCurrentAcademicYearLifecycle: mocks.lifecycle,
}));
vi.mock("@/lib/actions/analytics/data", () => ({
    fetchAnalyticsData: mocks.fetchAnalyticsData,
}));
vi.mock("@/lib/actions/analytics/system-overview", () => ({
    fetchSystemAnalyticsOverview: mocks.fetchSystemAnalyticsOverview,
}));
vi.mock("@/lib/actions/analytics/redis-cache", async (importOriginal) => {
    const actual = await importOriginal<
        typeof import("@/lib/actions/analytics/redis-cache")
    >();
    return {
        // Real key builders: the assertion is about the keys actually used.
        createAnalyticsRedisKeyParts: actual.createAnalyticsRedisKeyParts,
        createSystemOverviewRedisKeyParts: actual.createSystemOverviewRedisKeyParts,
        readRedisCachedAnalyticsData: mocks.readAnalytics,
        readRedisCachedSystemOverview: mocks.readOverview,
        setRedisCachedAnalyticsData: vi.fn(),
        setRedisCachedSystemOverview: vi.fn(),
    };
});
vi.mock("next/cache", () => ({
    unstable_cache: (fn: () => Promise<unknown>, keyParts: string[]) => {
        mocks.unstableCacheKeys.push(keyParts);
        return async () => {
            const before = mocks.lifecycle.mock.calls.length;
            const result = await fn();
            mocks.lifecycleCallsDuringCacheFill.push(
                mocks.lifecycle.mock.calls.length - before,
            );
            return result;
        };
    },
    updateTag: vi.fn(),
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
}));

const { getAnalyticsSummary, getSystemAnalyticsOverview } = await import(
    "@/lib/actions/analytics/main"
);

describe("analytics cache keys use the resolved current term", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.unstableCacheKeys.length = 0;
        mocks.lifecycleCallsDuringCacheFill.length = 0;
        mocks.lifecycle.mockResolvedValue(CURRENT_TERM);
        mocks.readAnalytics.mockResolvedValue({ data: null, versionedKeyParts: null });
        mocks.readOverview.mockResolvedValue({ data: null, versionedKeyParts: null });
        mocks.fetchAnalyticsData.mockResolvedValue({});
        mocks.fetchSystemAnalyticsOverview.mockResolvedValue({});
        mocks.getViewerContext.mockResolvedValue({
            role: "school_admin",
            schoolId: "school-1",
        });
    });

    it("keys the default school view like an explicit current-term request", async () => {
        await getAnalyticsSummary();
        await getAnalyticsSummary(undefined, undefined, 2569, 2);

        const [defaultRedisKey, explicitRedisKey] =
            mocks.readAnalytics.mock.calls.map((call) => call[0]);
        expect(defaultRedisKey).toEqual(explicitRedisKey);
        expect(defaultRedisKey).toContain("year:2569");
        expect(defaultRedisKey).toContain("semester:2");
        expect(mocks.unstableCacheKeys[0]).toEqual(mocks.unstableCacheKeys[1]);
        expect(mocks.fetchAnalyticsData.mock.calls[0]).toEqual(
            mocks.fetchAnalyticsData.mock.calls[1],
        );
    });

    it("keys the default overview like an explicit current-term request", async () => {
        mocks.getViewerContext.mockResolvedValue({ role: "system_admin" });

        await getSystemAnalyticsOverview();
        await getSystemAnalyticsOverview(2569, 2);

        const [defaultRedisKey, explicitRedisKey] =
            mocks.readOverview.mock.calls.map((call) => call[0]);
        expect(defaultRedisKey).toEqual(explicitRedisKey);
        expect(defaultRedisKey).toEqual([
            "analytics-system-overview",
            "coverage:per-class-v1",
            "year:2569",
            "semester:2",
        ]);
        expect(mocks.unstableCacheKeys[0]).toEqual(mocks.unstableCacheKeys[1]);
        expect(mocks.fetchSystemAnalyticsOverview).toHaveBeenCalledWith(2569, 2);
    });

    it("resolves a year-only overview request to the current term", async () => {
        mocks.getViewerContext.mockResolvedValue({ role: "system_admin" });

        await getSystemAnalyticsOverview(2568);

        expect(mocks.readOverview.mock.calls[0][0]).toEqual([
            "analytics-system-overview",
            "coverage:per-class-v1",
            "year:2569",
            "semester:2",
        ]);
        expect(mocks.fetchSystemAnalyticsOverview).toHaveBeenCalledWith(2569, 2);
    });

    it("runs the lifecycle before the cache on every call, never inside it", async () => {
        await getAnalyticsSummary(undefined, undefined, 2568, 1);
        mocks.getViewerContext.mockResolvedValue({ role: "system_admin" });
        await getSystemAnalyticsOverview(2568, 1);

        expect(mocks.lifecycle).toHaveBeenCalledTimes(2);
        expect(mocks.lifecycleCallsDuringCacheFill).toEqual([0, 0]);
        expect(mocks.lifecycle.mock.invocationCallOrder[0]).toBeLessThan(
            mocks.readAnalytics.mock.invocationCallOrder[0],
        );
        expect(mocks.lifecycle.mock.invocationCallOrder[1]).toBeLessThan(
            mocks.readOverview.mock.invocationCallOrder[0],
        );
    });

    it("keeps a semester-only school filter as requested", async () => {
        await getAnalyticsSummary(undefined, undefined, undefined, 1);

        expect(mocks.fetchAnalyticsData).toHaveBeenCalledWith(
            "school-1",
            "",
            "school_admin",
            "",
            "1",
            "",
        );
    });
});
