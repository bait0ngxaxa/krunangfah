import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
    prisma: {},
}));

vi.mock("@/lib/auth/viewer-context", () => ({
    getViewerContext: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
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
    revalidateTag: vi.fn(),
    unstable_cache: vi.fn((fn: unknown) => fn),
}));

vi.mock("@/lib/utils/logging", () => ({
    logError: vi.fn(),
}));

import { getViewerContext } from "@/lib/auth/viewer-context";
import {
    getDistinctClassesQuery,
    getRiskLevelCountsQuery,
    getStudentsForDashboardQuery,
} from "@/lib/actions/student/queries";
import {
    getStudentRiskCounts,
    getStudentsForDashboard,
} from "@/lib/actions/student/main";

describe("student main actions compatibility", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getViewerContext).mockResolvedValue({
            advisoryClass: "ม.1/1",
            role: "school_admin",
            schoolId: "school-1",
            userId: "user-1",
        });
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
            role: "system_admin",
            schoolId: null,
            userId: "user-1",
        });

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
});
