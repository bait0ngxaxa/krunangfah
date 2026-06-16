import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    revalidateRedisAnalyticsCache: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: mocks.revalidatePath,
    revalidateTag: mocks.revalidateTag,
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
        expect(mocks.revalidateTag).not.toHaveBeenCalled();
        expect(mocks.revalidatePath).not.toHaveBeenCalled();

        deferred.resolve();
        await result;

        expect(mocks.revalidateTag).toHaveBeenCalledWith("analytics", "default");
        expect(mocks.revalidateTag).toHaveBeenCalledWith(
            "analytics-overview",
            "default",
        );
        expect(mocks.revalidateTag).toHaveBeenCalledWith(
            "analytics:school:school-1",
            "default",
        );
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/analytics");
    });
});
