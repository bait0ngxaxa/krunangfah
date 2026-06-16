import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    updateTag: vi.fn(),
    revalidateRedisAnalyticsCache: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: mocks.revalidatePath,
    updateTag: mocks.updateTag,
}));

vi.mock("@/lib/actions/analytics/redis-cache", () => ({
    revalidateRedisAnalyticsCache: mocks.revalidateRedisAnalyticsCache,
}));

const { revalidateAnalyticsCache } = await import(
    "@/lib/actions/analytics/cache"
);

function createDeferred(): {
    promise: Promise<void>;
    resolve: () => void;
} {
    let resolvePromise: () => void = () => {};
    const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
    });
    return { promise, resolve: resolvePromise };
}

describe("analytics cache invalidation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.revalidateRedisAnalyticsCache.mockResolvedValue(undefined);
    });

    it("waits for Redis invalidation before revalidating Next cache", async () => {
        const deferred = createDeferred();
        mocks.revalidateRedisAnalyticsCache.mockReturnValueOnce(deferred.promise);

        const result = revalidateAnalyticsCache("school-1");
        await Promise.resolve();

        expect(mocks.revalidateRedisAnalyticsCache).toHaveBeenCalledWith("school-1");
        expect(mocks.updateTag).not.toHaveBeenCalled();
        expect(mocks.revalidatePath).not.toHaveBeenCalled();

        deferred.resolve();
        await result;

        expect(mocks.updateTag).toHaveBeenCalledWith("analytics");
        expect(mocks.updateTag).toHaveBeenCalledWith("analytics-overview");
        expect(mocks.updateTag).toHaveBeenCalledWith("analytics:school:school-1");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/analytics");
    });
});
