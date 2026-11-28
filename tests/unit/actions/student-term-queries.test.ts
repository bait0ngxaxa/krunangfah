import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    phqGroupBy: vi.fn(),
    academicYearFindMany: vi.fn(),
    academicYearFindFirst: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        phqResult: { groupBy: mocks.phqGroupBy },
        academicYear: {
            findMany: mocks.academicYearFindMany,
            findFirst: mocks.academicYearFindFirst,
        },
    },
}));

const { getAvailableTermsQuery, getCurrentAcademicYearIdQuery } = await import(
    "@/lib/actions/student/term-queries"
);

describe("student term queries", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("scopes terms to the class teacher's advisory class and groups rounds", async () => {
        mocks.phqGroupBy.mockResolvedValue([
            { academicYearId: "term-old", assessmentRound: 1 },
            { academicYearId: "term-new", assessmentRound: 2 },
            { academicYearId: "term-new", assessmentRound: 1 },
        ]);
        mocks.academicYearFindMany.mockResolvedValue([
            { id: "term-new", year: 2568, semester: 2 },
            { id: "term-old", year: 2568, semester: 1 },
        ]);

        const terms = await getAvailableTermsQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
        );

        expect(mocks.phqGroupBy).toHaveBeenCalledWith({
            by: ["academicYearId", "assessmentRound"],
            where: {
                student: expect.objectContaining({
                    schoolId: "school-1",
                    class: "ม.1/1",
                }),
            },
        });
        expect(mocks.academicYearFindMany).toHaveBeenCalledWith({
            where: { id: { in: ["term-old", "term-new"] } },
            select: { id: true, year: true, semester: true },
            orderBy: [{ year: "desc" }, { semester: "desc" }],
        });
        expect(terms).toEqual([
            { id: "term-new", year: 2568, semester: 2, rounds: [1, 2] },
            { id: "term-old", year: 2568, semester: 1, rounds: [1] },
        ]);
    });

    it("returns no terms without querying academic years when nothing is visible", async () => {
        mocks.phqGroupBy.mockResolvedValue([]);

        await expect(
            getAvailableTermsQuery("school-1", undefined, "class_teacher"),
        ).resolves.toEqual([]);
        expect(mocks.academicYearFindMany).not.toHaveBeenCalled();
    });

    it("reads the current term id without writing", async () => {
        mocks.academicYearFindFirst.mockResolvedValueOnce({ id: "term-new" });
        mocks.academicYearFindFirst.mockResolvedValueOnce(null);

        await expect(getCurrentAcademicYearIdQuery()).resolves.toBe("term-new");
        await expect(getCurrentAcademicYearIdQuery()).resolves.toBeNull();
        expect(mocks.academicYearFindFirst).toHaveBeenCalledWith({
            where: { isCurrent: true },
            select: { id: true },
        });
    });
});
