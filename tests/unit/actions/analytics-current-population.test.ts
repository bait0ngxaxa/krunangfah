import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("@/lib/database/prisma", () => ({
    prisma: { $queryRaw: mocks.queryRaw },
}));

const {
    getActivityCompletionSummary,
    getActivityProgressByRisk,
    getCombinedAnalytics,
    getTrendData,
} = await import("@/lib/actions/analytics/queries");

function collectSql(value: unknown): string {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(collectSql).join(" ");
    if (typeof value !== "object" || value === null) return "";

    const record = value as Record<string, unknown>;
    return [record.sql, record.strings, record.values]
        .map(collectSql)
        .join(" ");
}

describe("analytics student population scope", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.queryRaw.mockResolvedValue([]);
    });

    it("excludes all non-contributing statuses from current analytics", async () => {
        await getCombinedAnalytics("school-1", undefined, ["term-1"], 1);
        await getTrendData("school-1", undefined, ["term-1"], 1);
        await getActivityProgressByRisk(
            "school-1",
            undefined,
            ["term-1"],
            1,
        );
        await getActivityCompletionSummary(
            "school-1",
            undefined,
            ["term-1"],
            1,
        );

        expect(mocks.queryRaw).toHaveBeenCalledTimes(4);
        for (const call of mocks.queryRaw.mock.calls) {
            const sql = collectSql(call);
            expect(sql).toContain('s."status"::text NOT IN');
            expect(sql).toContain("RESIGNED");
            expect(sql).toContain("TRANSFERRED");
            expect(sql).toContain("GRADUATED");
        }
    });

    it("does not apply current lifecycle status to historical analytics", async () => {
        await getCombinedAnalytics(
            "school-1",
            undefined,
            ["historical-term"],
            1,
            false,
        );
        await getTrendData(
            "school-1",
            undefined,
            ["historical-term"],
            1,
            false,
        );
        await getActivityProgressByRisk(
            "school-1",
            undefined,
            ["historical-term"],
            1,
            false,
        );
        await getActivityCompletionSummary(
            "school-1",
            undefined,
            ["historical-term"],
            1,
            false,
        );

        expect(mocks.queryRaw).toHaveBeenCalledTimes(4);
        for (const call of mocks.queryRaw.mock.calls) {
            expect(collectSql(call)).not.toContain(
                's."status"::text NOT IN',
            );
        }
    });
});
