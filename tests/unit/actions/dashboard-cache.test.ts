import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    updateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: mocks.revalidatePath,
    updateTag: mocks.updateTag,
}));

const { revalidateDashboardCache } = await import(
    "@/lib/actions/dashboard/cache"
);

describe("dashboard cache invalidation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("expires dashboard and school cache tags immediately", () => {
        revalidateDashboardCache();

        expect(mocks.updateTag).toHaveBeenCalledWith("dashboard");
        expect(mocks.updateTag).toHaveBeenCalledWith("schools");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    });
});
