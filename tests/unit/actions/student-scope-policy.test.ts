import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    studentCount: vi.fn(),
    studentFindMany: vi.fn(),
    studentFindFirst: vi.fn(),
    studentReferralFindMany: vi.fn(),
    userFindMany: vi.fn(),
    studentGroupBy: vi.fn(),
    queryRaw: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        student: {
            count: mocks.studentCount,
            findMany: mocks.studentFindMany,
            findFirst: mocks.studentFindFirst,
            groupBy: mocks.studentGroupBy,
        },
        studentReferral: { findMany: mocks.studentReferralFindMany },
        user: { findMany: mocks.userFindMany },
        $queryRaw: mocks.queryRaw,
    },
}));

const { Prisma } = await import("@prisma/client");
const { buildNoResultInAcademicYearSql } = await import(
    "@/lib/actions/student/unscreened-filter"
);
const {
    getClassCountsQuery,
    getReferredStudentCountQuery,
    getRiskLevelCountsQuery,
    getStudentDetailQuery,
    getStudentsQuery,
    getStudentsForDashboardQuery,
    getUnscreenedStudentCountQuery,
    searchStudentsQuery,
} = await import("@/lib/actions/student/queries");

function collectSql(value: unknown): string {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(collectSql).join(" ");
    if (typeof value !== "object" || value === null) return "";

    const record = value as Record<string, unknown>;
    return [record.sql, record.strings, record.values]
        .map(collectSql)
        .join(" ");
}

describe("class_teacher student scope policy", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.studentCount.mockResolvedValue(0);
        mocks.studentFindMany.mockResolvedValue([]);
        mocks.studentFindFirst.mockResolvedValue(null);
        mocks.studentReferralFindMany.mockResolvedValue([]);
        mocks.userFindMany.mockResolvedValue([]);
        mocks.studentGroupBy.mockResolvedValue([]);
        mocks.queryRaw.mockResolvedValue([]);
    });

    it("keeps advisory students in risk counts after they are referred", async () => {
        await getRiskLevelCountsQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
        );

        const sql = collectSql(mocks.queryRaw.mock.calls[0]);
        expect(sql).toContain('s."class" =');
        expect(sql).not.toContain("NOT EXISTS");
        expect(sql).not.toContain('sr."toTeacherUserId"');
    });

    it("defines referred-only as referrals sent by the current teacher", async () => {
        await getStudentsForDashboardQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
            { referredOnly: true },
        );

        // The referral condition is ANDed; the advisory class stays top-level.
        const referredWhere = {
            where: expect.objectContaining({
                class: "ม.1/1",
                AND: expect.arrayContaining([
                    { referral: { is: { fromTeacherUserId: "teacher-1" } } },
                ]),
            }),
        };
        expect(mocks.studentCount).toHaveBeenCalledWith(referredWhere);

        mocks.studentCount.mockClear();
        await getReferredStudentCountQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
        );
        expect(mocks.studentCount).toHaveBeenCalledWith(referredWhere);
    });

    it("uses the active referral pointer and the same sender scope in the pie chart", async () => {
        for (const role of ["class_teacher", "school_admin"]) {
            await getRiskLevelCountsQuery(
                "school-1", "ม.1/1", role, "teacher-1", { referredOnly: true },
            );
        }
        const [teacherSql, adminSql] = mocks.queryRaw.mock.calls.map(collectSql);
        for (const sql of [teacherSql, adminSql]) {
            expect(sql).toContain('sr.id = s."activeReferralId"');
            expect(sql).not.toContain('sr."revokedAt"');
            expect(sql).not.toContain('sr."closedAt"');
        }
        expect(teacherSql).toContain('sr."fromTeacherUserId"');
        expect(adminSql).not.toContain('sr."fromTeacherUserId"');
    });

    it("keeps the advisory class when another class is passed to every query helper", async () => {
        mocks.studentCount.mockResolvedValue(1);
        const filters = {
            classFilter: "ม.1/2",
            latestRiskStudentIds: ["student-1"],
            referredOnly: true,
            academicYearId: "term-1",
            assessmentRound: 1,
        };

        await getStudentsForDashboardQuery(
            "school-1", "ม.1/1", "class_teacher", "teacher-1", filters,
        );
        await getReferredStudentCountQuery(
            "school-1", "ม.1/1", "class_teacher", "teacher-1", filters,
        );
        await getClassCountsQuery(
            "school-1", "ม.1/1", "class_teacher", "teacher-1", filters,
        );
        await getStudentsQuery(
            "school-1", "ม.1/1", "class_teacher", "teacher-1",
            { classFilter: "ม.1/2", page: 1, limit: 50 },
        );

        // Class counts ignore the class filter by design (they feed the class
        // picker); every other where also carries the requested class in AND.
        const classFilteredWheres = [
            ...mocks.studentCount.mock.calls.map((call) => call[0]?.where),
            ...mocks.studentFindMany.mock.calls.map((call) => call[0]?.where),
        ];
        const groupByWheres = mocks.studentGroupBy.mock.calls.map(
            (call) => call[0]?.where,
        );
        // dashboard count + findMany, referred count, list count + findMany.
        expect(classFilteredWheres).toHaveLength(5);
        expect(groupByWheres).toHaveLength(1);
        for (const where of classFilteredWheres) {
            expect(where.class).toBe("ม.1/1");
            expect(where.AND).toContainEqual({ class: "ม.1/2" });
        }
        expect(groupByWheres[0].class).toBe("ม.1/1");
        await getRiskLevelCountsQuery(
            "school-1", "ม.1/1", "class_teacher", "teacher-1", filters,
        );
        // Both class conditions still reach the chart SQL.
        const rawSql = collectSql(mocks.queryRaw.mock.calls[0]);
        expect(rawSql).toContain('s."class" =');
        expect(rawSql).toContain("s.class =");
    });

    it("uses the same advisory class for count list search detail and filters", async () => {
        await getStudentsQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
            { page: 1, limit: 50 },
        );
        await searchStudentsQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
            "สมชาย",
            false,
        );
        await getStudentDetailQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
            "student-1",
        );
        await getClassCountsQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
        );

        const whereClauses = [
            mocks.studentCount.mock.calls[0]?.[0]?.where,
            mocks.studentFindMany.mock.calls[0]?.[0]?.where,
            mocks.studentFindMany.mock.calls[1]?.[0]?.where,
            mocks.studentFindFirst.mock.calls[0]?.[0]?.where,
            mocks.studentGroupBy.mock.calls[0]?.[0]?.where,
        ];
        for (const where of whereClauses) {
            expect(where).toEqual(expect.objectContaining({ class: "ม.1/1" }));
        }
    });

    it("excludes non-contributing lifecycle statuses from current dashboard population", async () => {
        await getStudentsForDashboardQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
        );
        await getRiskLevelCountsQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
        );

        expect(mocks.studentCount).toHaveBeenCalledWith({
            where: expect.objectContaining({
                status: {
                    notIn: ["RESIGNED", "TRANSFERRED", "GRADUATED"],
                },
            }),
        });
        const sql = collectSql(mocks.queryRaw.mock.calls[0]);
        expect(sql).toContain('s."status"::text NOT IN');
        expect(sql).toContain("RESIGNED");
        expect(sql).toContain("TRANSFERRED");
        expect(sql).toContain("GRADUATED");
    });

    it("keeps historical dashboard and student detail visibility independent from current status", async () => {
        await getStudentsForDashboardQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
            { currentPopulationOnly: false },
        );
        await getRiskLevelCountsQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
            { currentPopulationOnly: false },
        );
        await getStudentDetailQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
            "historical-student",
        );

        expect(mocks.studentCount.mock.calls[0]?.[0]?.where).not.toHaveProperty(
            "status",
        );
        expect(collectSql(mocks.queryRaw.mock.calls[0])).not.toContain(
            's."status"::text NOT IN',
        );
        expect(
            mocks.studentFindFirst.mock.calls[0]?.[0]?.where,
        ).not.toHaveProperty("status");
    });

    it.each(["g1234567890123", "456789"])(
        "searches national IDs case-insensitively with query %s",
        async (query) => {
            await searchStudentsQuery(
                undefined,
                undefined,
                "system_admin",
                "admin-1",
                query,
                true,
            );

            expect(mocks.studentFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            {
                                nationalId: {
                                    contains: query,
                                    mode: "insensitive",
                                },
                            },
                        ]),
                    }),
                }),
            );
        },
    );

    it("adds the unscreened condition through AND and keeps the advisory class", async () => {
        const noResultThisYear = {
            AND: [
                { phqResults: { some: {} } },
                { phqResults: { none: { academicYear: { year: 2568 } } } },
            ],
        };

        await getStudentsForDashboardQuery(
            "school-1", "ม.1/1", "class_teacher", "teacher-1",
            { unscreenedYear: 2568, referredOnly: true },
        );
        await getClassCountsQuery(
            "school-1", "ม.1/1", "class_teacher", "teacher-1",
            { unscreenedYear: 2568 },
        );
        await getReferredStudentCountQuery(
            "school-1", "ม.1/1", "class_teacher", "teacher-1",
            { unscreenedYear: 2568 },
        );
        await getUnscreenedStudentCountQuery(
            "school-1", "ม.1/1", "class_teacher",
            { classFilter: "ม.1/1", academicYear: 2568 },
        );
        await getRiskLevelCountsQuery(
            "school-1", "ม.1/1", "class_teacher", "teacher-1",
            { unscreenedYear: 2568 },
        );

        const wheres = [
            ...mocks.studentCount.mock.calls.map((call) => call[0]?.where),
            ...mocks.studentGroupBy.mock.calls.map((call) => call[0]?.where),
        ];
        // list count, referred count, unscreened count, class counts.
        expect(wheres).toHaveLength(4);
        for (const where of wheres) {
            expect(where.class).toBe("ม.1/1");
            expect(where.status).toEqual({
                notIn: ["RESIGNED", "TRANSFERRED", "GRADUATED"],
            });
            expect(where.AND).toContainEqual(noResultThisYear);
        }
        const sql = collectSql(mocks.queryRaw.mock.calls[0]);
        expect(sql).toContain("NOT EXISTS");
        expect(sql).toContain('uay."year" =');
    });

    it("binds the academic year as a SQL parameter, and adds nothing without one", () => {
        expect(buildNoResultInAcademicYearSql(2568).values).toEqual([2568]);
        expect(buildNoResultInAcademicYearSql(undefined)).toBe(Prisma.empty);
    });

    it("does not grant class_teacher scope from an incoming referral", async () => {
        await getStudentDetailQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
            "student-outside-class",
        );

        expect(mocks.studentFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    id: "student-outside-class",
                    class: "ม.1/1",
                }),
            }),
        );
        const where = mocks.studentFindFirst.mock.calls[0]?.[0]?.where;
        expect(collectSql(where)).not.toContain("toTeacherUserId");
        expect(mocks.studentReferralFindMany).not.toHaveBeenCalled();
    });
});
