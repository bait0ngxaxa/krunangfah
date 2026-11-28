import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    queryRaw: vi.fn(),
    schoolClassFindMany: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        $queryRaw: mocks.queryRaw,
        schoolClass: { findMany: mocks.schoolClassFindMany },
    },
}));

const {
    buildResultClassWhere,
    getAvailableClassNames,
    hasLegacyClassAttribution,
} = await import("@/lib/actions/analytics/filter-options");
const { buildAttributedClassWhere } = await import("@/lib/utils/class-attribution");

const PAST = { id: "term-past", isCurrent: false };
const CURRENT = { id: "term-current", isCurrent: true };

/** The full query a tagged $queryRaw call received, nested fragments included. */
function fullSql(call: unknown[]): Prisma.Sql {
    const [strings, ...values] = call as [TemplateStringsArray, ...unknown[]];
    return Prisma.sql(strings, ...values);
}

describe("analytics filter options", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.queryRaw.mockResolvedValue([]);
        mocks.schoolClassFindMany.mockResolvedValue([{ name: "ม.1/1" }]);
    });

    it("scopes a class teacher by current class and filters admins by attribution", () => {
        expect(buildResultClassWhere({ scopeClass: "ม.2/1" })).toEqual({
            student: { class: "ม.2/1" },
        });
        expect(buildResultClassWhere({ classFilter: "ม.1/1" })).toEqual(
            buildAttributedClassWhere("ม.1/1"),
        );
        expect(buildResultClassWhere({})).toEqual({});
    });

    it.each([
        ["the current term only", [CURRENT]],
        ["no term filter", undefined],
        ["a year with no terms", []],
    ])("lists today's active classes for %s", async (_name, terms) => {
        await expect(getAvailableClassNames("school-1", terms)).resolves.toEqual(["ม.1/1"]);
        expect(mocks.schoolClassFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ schoolId: "school-1", archivedAt: null }),
            }),
        );
        expect(mocks.queryRaw).not.toHaveBeenCalled();
    });

    it("lists past terms' term rows and attributed classes, archived included", async () => {
        mocks.queryRaw.mockResolvedValue([{ name: "ม.1/1" }, { name: "ม.1/9" }]);
        const pastSemesterOne = { id: "term-past-1", isCurrent: false };

        await expect(
            getAvailableClassNames("school-1", [pastSemesterOne, PAST]),
        ).resolves.toEqual(["ม.1/1", "ม.1/9"]);
        const sql = fullSql(mocks.queryRaw.mock.calls[0] ?? []);
        expect(sql.sql).toContain("school_class_terms");
        expect(sql.sql).toContain("UNION");
        // No archive filter, and no active-class branch without the current term.
        expect(sql.sql).not.toContain("archivedAt");
        expect(sql.values).toEqual(expect.arrayContaining(["term-past-1", "term-past"]));
        expect(mocks.schoolClassFindMany).not.toHaveBeenCalled();
    });

    it("adds today's active classes when the current term is among past terms", async () => {
        mocks.queryRaw.mockResolvedValue([{ name: "ม.1/9" }, { name: "ม.2/1" }]);

        await expect(getAvailableClassNames("school-1", [PAST, CURRENT])).resolves.toEqual([
            "ม.1/9",
            "ม.2/1",
        ]);
        const sql = fullSql(mocks.queryRaw.mock.calls[0] ?? []);
        expect(sql.sql).toContain('sc."archivedAt" IS NULL');
        // The current term's rows come from the active-class branch, not its term rows.
        expect(sql.values).not.toContain("term-current");
    });

    it.each([
        ["the current term", { isClassTeacherView: false, singleTerm: CURRENT }],
        ["a multi-term view", { isClassTeacherView: false, singleTerm: undefined }],
        ["a class teacher", { isClassTeacherView: true, singleTerm: PAST }],
    ])("never flags legacy rows for %s", async (_name, input) => {
        await expect(
            hasLegacyClassAttribution({ schoolId: "school-1", assessmentRound: undefined, ...input }),
        ).resolves.toBe(false);
        expect(mocks.queryRaw).not.toHaveBeenCalled();
    });

    it("checks a single past term over school and round only, with one EXISTS query", async () => {
        mocks.queryRaw.mockResolvedValue([{ has_legacy: true }]);

        await expect(
            hasLegacyClassAttribution({
                schoolId: "school-1",
                isClassTeacherView: false,
                singleTerm: PAST,
                assessmentRound: 1,
            }),
        ).resolves.toBe(true);
        expect(mocks.queryRaw).toHaveBeenCalledOnce();
        const sql = fullSql(mocks.queryRaw.mock.calls[0] ?? []);
        expect(sql.sql).toContain("SELECT EXISTS");
        expect(sql.sql).toContain('pr."className" IS NULL');
        expect(sql.sql).toContain('pr."assessmentRound"');
        // No class condition: a legacy row may have left the selected class.
        expect(sql.sql).not.toContain("s.class");
        expect(sql.values).toEqual(expect.arrayContaining(["school-1", "term-past", 1]));
    });
});
