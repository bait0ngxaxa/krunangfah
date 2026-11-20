import { expect, it } from "vitest";
import { prisma } from "@/lib/database/prisma";
import { cleanupAll } from "./helpers/cleanup";
import { createFixtureIds, createTestAcademicYear, createTestSchool } from "./helpers/seed";

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

it("isolates concurrent term scopes and rejects implicit reuse of another scope's term", async () => {
    const firstScope = createFixtureIds();
    const secondScope = createFixtureIds();
    try {
        const [first, second] = await Promise.all([
            createTestAcademicYear({ year: 2655 }, firstScope),
            createTestAcademicYear({ year: 2656 }, secondScope),
        ]);

        await expect(createTestAcademicYear({ year: first.year }, secondScope))
            .rejects.toMatchObject({ code: "P2002" });
        await cleanupAll(secondScope);

        await expect(prisma.academicYear.findUnique({ where: { id: second.id } })).resolves.toBeNull();
        await expect(prisma.academicYear.findUnique({ where: { id: first.id } })).resolves.toEqual(first);

        await cleanupAll(firstScope);
        await cleanupAll(firstScope);
        await expect(prisma.academicYear.findUnique({ where: { id: first.id } })).resolves.toBeNull();
    } finally {
        await Promise.all([cleanupAll(firstScope), cleanupAll(secondScope)]);
    }
});
