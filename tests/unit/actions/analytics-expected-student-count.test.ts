import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
    schoolClassTerm: { aggregate: vi.fn() },
    schoolClass: { aggregate: vi.fn() },
}));

vi.mock("@/lib/database/prisma", () => ({ prisma: prismaMock }));

import { getExpectedStudentCount } from "@/lib/actions/analytics/main";

describe("Analytics expected student count scope", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("uses the selected academic year and semester term as the denominator", async () => {
        prismaMock.schoolClassTerm.aggregate.mockResolvedValue({
            _sum: { expectedStudentCount: 24 },
        });

        await expect(
            getExpectedStudentCount("school-1", "ม.1/1", ["historical-term"]),
        ).resolves.toBe(24);
        expect(prismaMock.schoolClassTerm.aggregate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    academicYearId: "historical-term",
                }),
            }),
        );
        expect(prismaMock.schoolClass.aggregate).not.toHaveBeenCalled();
    });

    it("does not fall back to the current class count for a historical term", async () => {
        prismaMock.schoolClassTerm.aggregate.mockResolvedValue({
            _sum: { expectedStudentCount: null },
        });
        prismaMock.schoolClass.aggregate.mockResolvedValue({
            _sum: { expectedStudentCount: 99 },
        });

        await expect(
            getExpectedStudentCount("school-1", "ม.1/1", ["historical-term"]),
        ).resolves.toBeNull();
        expect(prismaMock.schoolClass.aggregate).not.toHaveBeenCalled();
    });
});
