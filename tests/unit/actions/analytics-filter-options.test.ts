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

function sqlText(call: unknown[]): string {
    const [strings] = call as [TemplateStringsArray];
    return strings.join(" ");
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
        ["the current term", CURRENT],
        ["a multi-term view", undefined],
    ])("lists today's active classes for %s", async (_name, term) => {
        await expect(getAvailableClassNames("school-1", term)).resolves.toEqual(["ม.1/1"]);
        expect(mocks.schoolClassFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ schoolId: "school-1", archivedAt: null }),
            }),
        );
        expect(mocks.queryRaw).not.toHaveBeenCalled();
    });

    it("lists a past term's term rows and attributed classes without an archive filter", async () => {
        mocks.queryRaw.mockResolvedValue([{ name: "ม.1/1" }, { name: "ม.1/9" }]);

        await expect(getAvailableClassNames("school-1", PAST)).resolves.toEqual(["ม.1/1", "ม.1/9"]);
        const sql = sqlText(mocks.queryRaw.mock.calls[0] ?? []);
        expect(sql).toContain("school_class_terms");
        expect(sql).toContain("UNION");
        expect(sql).not.toContain("archivedAt");
        expect(mocks.schoolClassFindMany).not.toHaveBeenCalled();
    });

    it.each([
        ["the current term", { classes: {}, singleTerm: CURRENT }],
        ["a multi-term view", { classes: {}, singleTerm: undefined }],
        ["a class teacher", { classes: { scopeClass: "ม.2/1" }, singleTerm: PAST }],
    ])("never flags legacy rows for %s", async (_name, input) => {
        await expect(
            hasLegacyClassAttribution({ schoolId: "school-1", assessmentRound: undefined, ...input }),
        ).resolves.toBe(false);
        expect(mocks.queryRaw).not.toHaveBeenCalled();
    });

    it("checks a single past term with one EXISTS query", async () => {
        mocks.queryRaw.mockResolvedValue([{ has_legacy: true }]);

        await expect(
            hasLegacyClassAttribution({
                schoolId: "school-1",
                classes: { classFilter: "ม.1/1" },
                singleTerm: PAST,
                assessmentRound: 1,
            }),
        ).resolves.toBe(true);
        expect(mocks.queryRaw).toHaveBeenCalledOnce();
        const sql = sqlText(mocks.queryRaw.mock.calls[0] ?? []);
        expect(sql).toContain("SELECT EXISTS");
        expect(sql).toContain('pr."className" IS NULL');
    });
});
