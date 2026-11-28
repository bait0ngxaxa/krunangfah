import { beforeEach, describe, expect, it, vi } from "vitest";
import { Gender, StudentStatus } from "@prisma/client";

const prismaMocks = vi.hoisted(() => ({
    activityProgressFindMany: vi.fn(),
    phqResultCount: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        activityProgress: { findMany: prismaMocks.activityProgressFindMany },
        phqResult: { count: prismaMocks.phqResultCount },
    },
}));

vi.mock("@/lib/auth/viewer-context", () => ({
    getViewerContext: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
    isSystemAdmin: vi.fn((role: string) => role === "system_admin"),
}));

vi.mock("@/lib/actions/student/queries", () => ({
    getDistinctClassesQuery: vi.fn(),
    getRiskLevelCountsQuery: vi.fn(),
    getStudentDetailQuery: vi.fn(),
    getStudentsForDashboardQuery: vi.fn(),
    getStudentsQuery: vi.fn(),
    searchStudentsQuery: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    updateTag: vi.fn(),
    unstable_cache: vi.fn((fn: unknown) => fn),
}));

vi.mock("@/lib/utils/logging", () => ({
    logError: vi.fn(),
}));

import { getViewerContext } from "@/lib/auth/viewer-context";
import {
    getDistinctClassesQuery,
    getRiskLevelCountsQuery,
    getStudentDetailQuery,
    getStudentsForDashboardQuery,
    getStudentsQuery,
    searchStudentsQuery,
} from "@/lib/actions/student/queries";
import {
    getIncompleteActivityWarning,
    getStudentRiskCounts,
    getStudentDetail,
    getStudentDetailResult,
    getStudents,
    getStudentsForDashboard,
    hasRound1Data,
    searchStudents,
} from "@/lib/actions/student/main";
import type { ViewerContext } from "@/lib/auth/viewer-context";
import type { QueryResult } from "@/lib/actions/query-result";

function getQueryData<T>(result: QueryResult<T>): T {
    if (result.status === "success" || result.status === "empty") {
        return result.data;
    }
    throw new Error(`Expected query data, received ${result.status}`);
}

function createSearchResult(nationalId: string) {
    const now = new Date("2026-05-25T00:00:00.000Z");

    return {
        id: "student-1",
        firstName: "สมชาย",
        lastName: "ทดสอบ",
        studentId: "001",
        nationalId,
        class: "ม.1/1",
        schoolId: "school-1",
        school: {
            name: "โรงเรียนทดสอบ",
        },
        createdAt: now,
        updatedAt: now,
        age: 13,
        gender: Gender.MALE,
        status: StudentStatus.ACTIVE,
        statusChangedAt: null,
        leftAt: null,
        disabledAt: null,
        disabledById: null,
        disabledReason: null,
        restoredAt: null,
        restoredById: null,
        restoreReason: null,
        isTestData: false,
        testDataMarkedAt: null,
        testDataMarkedById: null,
        testDataReason: null,
        phqResults: [],
        activeReferralId: null,
        referral: null,
    };
}

describe("student main actions compatibility", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getViewerContext).mockResolvedValue({
            advisoryClass: "ม.1/1",
            isPrimary: false,
            role: "school_admin",
            schoolId: "school-1",
            userId: "user-1",
        } satisfies ViewerContext);
        prismaMocks.phqResultCount.mockResolvedValue(0);
        prismaMocks.activityProgressFindMany.mockResolvedValue([]);
    });

    it("unwraps students array from getStudentsForDashboardQuery", async () => {
        const students = [
            {
                id: "s1",
                firstName: "สมชาย",
                lastName: "ทดสอบ",
                studentId: "001",
                class: "ม.1/1",
                schoolId: "school-1",
                phqResults: [{ totalScore: 3, riskLevel: "blue" }],
                referral: null,
            },
        ];
        vi.mocked(getStudentsForDashboardQuery).mockResolvedValue({
            students,
            pagination: {
                total: 1,
                page: 1,
                limit: 50,
                totalPages: 1,
            },
        });

        const result = getQueryData(await getStudentsForDashboard());

        expect(result).toEqual(students);
    });

    it("returns empty array for system admin without selected school", async () => {
        vi.mocked(getViewerContext).mockResolvedValue({
            advisoryClass: undefined,
            isPrimary: false,
            role: "system_admin",
            schoolId: undefined,
            userId: "user-1",
        } satisfies ViewerContext);

        const result = await getStudentsForDashboard();

        expect(result).toEqual({ status: "empty", data: [] });
        expect(getStudentsForDashboardQuery).not.toHaveBeenCalled();
    });

    it("passes class filter using the new risk counts query options shape", async () => {
        vi.mocked(getDistinctClassesQuery).mockResolvedValue(["ม.1/1"]);
        vi.mocked(getRiskLevelCountsQuery).mockResolvedValue([
            { risk_level: "blue", count: BigInt(5) },
        ]);

        const result = getQueryData(await getStudentRiskCounts("ม.1/1"));

        expect(getRiskLevelCountsQuery).toHaveBeenCalledWith(
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            {
                classFilter: "ม.1/1",
            },
        );
        expect(result).toEqual({
            blue: 5,
            green: 0,
            yellow: 0,
            orange: 0,
            red: 0,
            total: 5,
            classes: ["ม.1/1"],
        });
    });

    it("hides nationalId from non-system admin search results", async () => {
        vi.mocked(searchStudentsQuery).mockResolvedValue([
            createSearchResult("1103700000011"),
        ]);

        const result = getQueryData(await searchStudents("สมชาย"));

        expect(searchStudentsQuery).toHaveBeenCalledWith(
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            "สมชาย",
            false,
        );
        expect(result[0]?.nationalId).toBeNull();
    });

    it("allows system admin identifier search and returns a masked result", async () => {
        vi.mocked(getViewerContext).mockResolvedValue({
            advisoryClass: undefined,
            isPrimary: false,
            role: "system_admin",
            schoolId: undefined,
            userId: "user-1",
        } satisfies ViewerContext);
        vi.mocked(searchStudentsQuery).mockResolvedValue([
            createSearchResult("1103700000011"),
        ]);

        const result = getQueryData(await searchStudents("1103700000011"));

        expect(searchStudentsQuery).toHaveBeenCalledWith(
            undefined,
            undefined,
            "system_admin",
            "user-1",
            "1103700000011",
            true,
        );
        expect(result[0]?.nationalId).toBe("*********0011");
    });

    it("distinguishes detail query failures from not_found", async () => {
        vi.mocked(getStudentDetailQuery).mockRejectedValue(
            new Error("database unavailable"),
        );

        const result = await getStudentDetailResult("student-1");

        expect(result).toEqual({
            status: "transient_error",
            requestId: expect.any(String),
            message: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        });
        await expect(getStudentDetail("student-1")).rejects.toThrow(
            "Student detail query failed",
        );
    });

    it("returns success and empty distinctly for the student list", async () => {
        const students = [createSearchResult("1103700000011")];
        vi.mocked(getStudentsQuery)
            .mockResolvedValueOnce({ students, total: 1 })
            .mockResolvedValueOnce({ students: [], total: 0 });

        const success = await getStudents({ page: 2, limit: 20 });
        const empty = await getStudents({ page: 2, limit: 20 });

        expect(success.status).toBe("success");
        expect(getQueryData(success).students).toHaveLength(1);
        expect(empty).toEqual({
            status: "empty",
            data: {
                students: [],
                pagination: {
                    total: 0,
                    page: 2,
                    limit: 20,
                    totalPages: 0,
                },
            },
        });
    });

    it("returns transient_error instead of an empty student page on Prisma failure", async () => {
        vi.mocked(getStudentsQuery).mockRejectedValue(
            new Error("database unavailable"),
        );

        const result = await getStudents({ page: 2, limit: 20 });

        expect(result).toEqual({
            status: "transient_error",
            requestId: expect.any(String),
            message: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        });
        expect(result).not.toHaveProperty("data");
    });

    it("distinguishes found, missing, and forbidden student detail", async () => {
        const student = createSearchResult("1103700000011") as unknown as NonNullable<
            Awaited<ReturnType<typeof getStudentDetailQuery>>
        >;
        vi.mocked(getStudentDetailQuery).mockResolvedValueOnce(student);

        await expect(getStudentDetailResult("student-1")).resolves.toEqual({
            status: "success",
            data: student,
        });

        vi.mocked(getStudentDetailQuery).mockResolvedValueOnce(null);
        await expect(getStudentDetailResult("student-404")).resolves.toEqual({
            status: "not_found",
        });

        vi.mocked(getViewerContext).mockResolvedValue({
            advisoryClass: undefined,
            isPrimary: false,
            role: "school_admin",
            schoolId: undefined,
            userId: "user-1",
        } satisfies ViewerContext);
        await expect(getStudentDetailResult("student-1")).resolves.toEqual({
            status: "forbidden",
        });
    });

    it("keeps false boolean checks distinct from query failures", async () => {
        prismaMocks.phqResultCount
            .mockResolvedValueOnce(1)
            .mockResolvedValueOnce(0)
            .mockRejectedValueOnce(new Error("database unavailable"));

        await expect(hasRound1Data("year-1")).resolves.toEqual({
            status: "success",
            data: true,
        });
        await expect(hasRound1Data("year-1")).resolves.toEqual({
            status: "success",
            data: false,
        });
        const failed = await hasRound1Data("year-1");
        expect(failed.status).toBe("transient_error");
    });

    describe("class teacher with another class's filter", () => {
        beforeEach(() => {
            vi.mocked(getViewerContext).mockResolvedValue({
                advisoryClass: "ม.1/1",
                isPrimary: false,
                role: "class_teacher",
                schoolId: "school-1",
                userId: "teacher-1",
            } satisfies ViewerContext);
        });

        it("getStudents returns an empty page without querying", async () => {
            for (const page of [1, 2]) {
                const result = await getStudents({ classFilter: "ม.1/2", page });

                expect(result).toEqual({
                    status: "empty",
                    data: {
                        students: [],
                        pagination: { total: 0, page, limit: 100, totalPages: 0 },
                    },
                });
            }
            expect(getStudentsQuery).not.toHaveBeenCalled();
        });

        it("getStudents still serves the teacher's own class", async () => {
            vi.mocked(getStudentsQuery).mockResolvedValue({
                students: [],
                total: 0,
            });

            await getStudents({ classFilter: "ม.1/1", page: 2 });

            expect(getStudentsQuery).toHaveBeenCalledWith(
                "school-1",
                "ม.1/1",
                "class_teacher",
                "teacher-1",
                { classFilter: "ม.1/1", page: 2, limit: 100 },
            );
        });

        it("getStudentRiskCounts returns zero counts without querying", async () => {
            const result = await getStudentRiskCounts("ม.1/2");

            expect(result).toEqual({
                status: "empty",
                data: {
                    red: 0,
                    orange: 0,
                    yellow: 0,
                    green: 0,
                    blue: 0,
                    total: 0,
                    classes: [],
                },
            });
            expect(getRiskLevelCountsQuery).not.toHaveBeenCalled();
            expect(getDistinctClassesQuery).not.toHaveBeenCalled();
        });

        it("getIncompleteActivityWarning counts only the advisory class", async () => {
            const noOtherClass = await getIncompleteActivityWarning(
                "year-1",
                2,
                ["ม.1/2"],
            );
            expect(noOtherClass).toEqual({
                status: "success",
                data: {
                    hasIncomplete: false,
                    studentCount: 0,
                    activityCount: 0,
                    previousRound: 1,
                },
            });
            expect(prismaMocks.activityProgressFindMany).not.toHaveBeenCalled();

            await getIncompleteActivityWarning("year-1", 2, ["ม.1/1", "ม.1/2"]);
            expect(prismaMocks.activityProgressFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        phqResult: expect.objectContaining({
                            student: expect.objectContaining({
                                class: { in: ["ม.1/1"] },
                            }),
                        }),
                    }),
                }),
            );
        });
    });

    it("does not report no incomplete activities when the query fails", async () => {
        prismaMocks.activityProgressFindMany.mockRejectedValue(
            new Error("database unavailable"),
        );

        const result = await getIncompleteActivityWarning(
            "year-1",
            2,
            ["ม.1/1"],
        );

        expect(result.status).toBe("transient_error");
        expect(result).not.toHaveProperty("data");
    });
});
