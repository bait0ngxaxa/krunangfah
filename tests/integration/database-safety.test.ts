import { expect, it } from "vitest";
import { prisma } from "@/lib/database/prisma";
import { cleanupAll } from "./helpers/cleanup";
import { createTestSchool } from "./helpers/seed";

it("cleans up tracked fixtures on the verified database and leaves other rows alone", async () => {
    const sentinel = await prisma.school.create({ data: { name: "Untracked cleanup sentinel" } });
    try {
        const fixture = await createTestSchool({ name: "Tracked cleanup fixture" });
        await cleanupAll();
        await expect(prisma.school.findUnique({ where: { id: fixture.id } })).resolves.toBeNull();
        await expect(prisma.school.findUnique({ where: { id: sentinel.id } })).resolves.toMatchObject({ id: sentinel.id });
    } finally {
        await prisma.school.delete({ where: { id: sentinel.id } });
    }
});
