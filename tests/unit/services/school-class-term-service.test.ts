import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
    academicYear: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
    },
    schoolClass: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
    },
    schoolClassTerm: {
        createMany: vi.fn(),
        upsert: vi.fn(),
    },
}));

vi.mock("@/lib/database/prisma", () => ({ prisma: prismaMock }));

import {
    ensureSchoolClassTermsForAcademicYear,
    hasMissingSchoolClassTermsForAcademicYear,
} from "@/lib/services/school-class-term-service";

describe("school class term service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates only missing term rows for the requested school", async () => {
        prismaMock.academicYear.findUnique
            .mockResolvedValueOnce({ id: "term-2" })
            .mockResolvedValueOnce({ id: "term-2", year: 2569, semester: 1 });
        prismaMock.schoolClass.findMany.mockResolvedValue([
            {
                id: "class-missing",
                expectedStudentCount: 30,
                terms: [
                    {
                        academicYearId: "term-1",
                        expectedStudentCount: 24,
                        academicYear: { year: 2568, semester: 2 },
                    },
                ],
            },
            {
                id: "class-existing",
                expectedStudentCount: 20,
                terms: [
                    {
                        academicYearId: "term-2",
                        expectedStudentCount: 20,
                        academicYear: { year: 2569, semester: 1 },
                    },
                ],
            },
        ]);
        prismaMock.schoolClassTerm.createMany.mockResolvedValue({ count: 1 });

        await expect(
            ensureSchoolClassTermsForAcademicYear("school-1", "term-2"),
        ).resolves.toBe("term-2");

        expect(prismaMock.schoolClass.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { schoolId: "school-1" } }),
        );
        expect(prismaMock.schoolClassTerm.createMany).toHaveBeenCalledWith({
            data: [
                {
                    schoolClassId: "class-missing",
                    academicYearId: "term-2",
                    expectedStudentCount: 24,
                },
            ],
            skipDuplicates: true,
        });
    });

    it("detects missing terms only for active production school classes", async () => {
        prismaMock.schoolClass.findFirst.mockResolvedValue({
            id: "class-missing",
        });

        await expect(
            hasMissingSchoolClassTermsForAcademicYear("term-2"),
        ).resolves.toBe(true);

        expect(prismaMock.schoolClass.findFirst).toHaveBeenCalledWith({
            where: {
                school: { disabledAt: null, isTestData: false },
                terms: { none: { academicYearId: "term-2" } },
            },
            select: { id: true },
        });

        prismaMock.schoolClass.findFirst.mockResolvedValue(null);

        await expect(
            hasMissingSchoolClassTermsForAcademicYear("term-2"),
        ).resolves.toBe(false);
    });

    it("can complete a later retry after term creation fails", async () => {
        prismaMock.academicYear.findUnique
            .mockResolvedValueOnce({ id: "term-2" })
            .mockResolvedValueOnce({ id: "term-2", year: 2569, semester: 1 })
            .mockResolvedValueOnce({ id: "term-2" })
            .mockResolvedValueOnce({ id: "term-2", year: 2569, semester: 1 });
        prismaMock.schoolClass.findMany.mockResolvedValue([
            {
                id: "class-missing",
                expectedStudentCount: 30,
                terms: [],
            },
        ]);
        prismaMock.schoolClassTerm.createMany
            .mockRejectedValueOnce(new Error("term storage unavailable"))
            .mockResolvedValue({ count: 1 });

        await expect(
            ensureSchoolClassTermsForAcademicYear("school-1", "term-2"),
        ).rejects.toThrow("term storage unavailable");
        await expect(
            ensureSchoolClassTermsForAcademicYear("school-1", "term-2"),
        ).resolves.toBe("term-2");

        expect(prismaMock.schoolClassTerm.createMany).toHaveBeenCalledTimes(2);
    });
});
