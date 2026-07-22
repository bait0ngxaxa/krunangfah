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

const {
    getClassCountsQuery,
    getReferredStudentCountQuery,
    getRiskLevelCountsQuery,
    getStudentDetailQuery,
    getStudentsQuery,
    getStudentsForDashboardQuery,
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

        expect(mocks.studentCount).toHaveBeenCalledWith({
            where: expect.objectContaining({
                class: "ม.1/1",
                referral: {
                    is: { fromTeacherUserId: "teacher-1" },
                },
            }),
        });

        mocks.studentCount.mockClear();
        await getReferredStudentCountQuery(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "teacher-1",
        );
        expect(mocks.studentCount).toHaveBeenCalledWith({
            where: expect.objectContaining({
                class: "ม.1/1",
                referral: {
                    is: { fromTeacherUserId: "teacher-1" },
                },
            }),
        });
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
