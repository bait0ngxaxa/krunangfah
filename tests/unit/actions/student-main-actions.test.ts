import { beforeEach, describe, expect, it, vi } from "vitest";
import { Gender, StudentStatus } from "@prisma/client";

vi.mock("@/lib/database/prisma", () => ({
    prisma: {},
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
    searchStudentsQuery,
} from "@/lib/actions/student/queries";
import {
    getStudentRiskCounts,
    getStudentDetail,
    getStudentDetailResult,
    getStudentsForDashboard,
    searchStudents,
} from "@/lib/actions/student/main";
import type { ViewerContext } from "@/lib/auth/viewer-context";

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

        const result = await getStudentsForDashboard();

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

        expect(result).toEqual([]);
        expect(getStudentsForDashboardQuery).not.toHaveBeenCalled();
    });

    it("passes class filter using the new risk counts query options shape", async () => {
        vi.mocked(getDistinctClassesQuery).mockResolvedValue(["ม.1/1"]);
        vi.mocked(getRiskLevelCountsQuery).mockResolvedValue([
            { risk_level: "blue", count: BigInt(5) },
        ]);

        const result = await getStudentRiskCounts("ม.1/1");

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

        const result = await searchStudents("สมชาย");

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

    it("allows system admin to receive nationalId in search results", async () => {
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

        const result = await searchStudents("1103700000011");

        expect(searchStudentsQuery).toHaveBeenCalledWith(
            undefined,
            undefined,
            "system_admin",
            "user-1",
            "1103700000011",
            true,
        );
        expect(result[0]?.nationalId).toBe("1103700000011");
    });

    it("distinguishes detail query failures from not_found", async () => {
        vi.mocked(getStudentDetailQuery).mockRejectedValue(
            new Error("database unavailable"),
        );

        const result = await getStudentDetailResult("student-1");

        expect(result).toEqual({
            status: "transient_error",
            requestId: expect.any(String),
        });
        await expect(getStudentDetail("student-1")).rejects.toThrow(
            "Student detail query failed",
        );
    });
});
