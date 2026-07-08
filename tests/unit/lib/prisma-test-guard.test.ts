import { describe, expect, it, vi } from "vitest";

describe("Prisma test guard", () => {
    it("blocks real Prisma client imports in test environment", async () => {
        vi.resetModules();

        await expect(import("@/lib/database/prisma")).rejects.toThrow(
            "Tests must mock @/lib/database/prisma",
        );
    });
});
