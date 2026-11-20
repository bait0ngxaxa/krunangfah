import { afterEach, describe, expect, it, vi } from "vitest";

describe("Prisma test guard", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("blocks real Prisma client imports in test environment", async () => {
        vi.resetModules();

        await expect(import("@/lib/database/prisma")).rejects.toThrow(
            "Tests must mock @/lib/database/prisma",
        );
    });

    it("does not let the legacy environment switch enable Prisma without verification", async () => {
        vi.stubEnv("ALLOW_REAL_PRISMA_TESTS", "true");
        vi.resetModules();

        await expect(import("@/lib/database/prisma")).rejects.toThrow("verified integration database setup");
    });
});
