import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/viewer-context", () => ({
    getViewerContext: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
    isSystemAdmin: vi.fn((role: string) => role === "system_admin"),
}));

vi.mock("@/lib/actions/student/queries", () => ({
    getClassCountsQuery: vi.fn(),
    getReferredStudentCountQuery: vi.fn(),
    getRiskLevelCountsQuery: vi.fn(),
    getStudentsForDashboardQuery: vi.fn(),
}));

vi.mock("@/lib/utils/logging", () => ({
    logError: vi.fn(),
}));

import { getViewerContext } from "@/lib/auth/viewer-context";
import {
    getClassCountsQuery,
    getReferredStudentCountQuery,
    getRiskLevelCountsQuery,
    getStudentsForDashboardQuery,
} from "@/lib/actions/student/queries";
import { getStudentDashboardData } from "@/lib/actions/student/dashboard";
import type { ViewerContext } from "@/lib/auth/viewer-context";

const baseViewer: ViewerContext = {
    advisoryClass: "ม.1/1",
    isPrimary: false,
    role: "school_admin",
    schoolId: "school-1",
    userId: "user-1",
};

function createStudent(id: string, riskLevel: string) {
    return {
        id,
        firstName: `ชื่อ${id}`,
        lastName: "ทดสอบ",
        studentId: id,
        class: "ม.1/1",
        schoolId: "school-1",
        phqResults: [{ totalScore: 5, riskLevel }],
        referral: null,
    };
}

describe("getStudentDashboardData", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getViewerContext).mockResolvedValue(baseViewer);
        vi.mocked(getClassCountsQuery).mockResolvedValue([
            { class: "ม.1/1", _count: { class: 30 } },
            { class: "ม.1/2", _count: { class: 28 } },
        ]);
        vi.mocked(getRiskLevelCountsQuery).mockResolvedValue([
            { risk_level: "blue", count: BigInt(20) },
            { risk_level: "green", count: BigInt(25) },
            { risk_level: "yellow", count: BigInt(13) },
        ]);
        vi.mocked(getReferredStudentCountQuery).mockResolvedValue(4);
        vi.mocked(getStudentsForDashboardQuery).mockResolvedValue({
            students: [createStudent("001", "blue"), createStudent("002", "green")],
            pagination: {
                total: 2,
                page: 1,
                limit: 50,
                totalPages: 1,
            },
        });
    });

    it("returns empty data for system admin without selected school", async () => {
        vi.mocked(getViewerContext).mockResolvedValue({
            ...baseViewer,
            isPrimary: false,
            role: "system_admin",
            schoolId: undefined,
        });

        const result = await getStudentDashboardData();

        expect(result.students).toEqual([]);
        expect(result.totalStudents).toBe(0);
        expect(getClassCountsQuery).not.toHaveBeenCalled();
        expect(getStudentsForDashboardQuery).not.toHaveBeenCalled();
    });

    it("skips student list query when multiple classes are visible and no class is selected", async () => {
        const result = await getStudentDashboardData({
            schoolId: "school-1",
        });

        expect(getClassCountsQuery).toHaveBeenCalledTimes(2);
        expect(getClassCountsQuery).toHaveBeenNthCalledWith(
            1,
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            { referredOnly: false },
        );
        expect(getClassCountsQuery).toHaveBeenNthCalledWith(
            2,
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            { referredOnly: false, riskFilter: undefined },
        );
        expect(getStudentsForDashboardQuery).not.toHaveBeenCalled();
        expect(result.students).toEqual([]);
        expect(result.pagination.total).toBe(0);
        expect(result.totalStudents).toBe(58);
    });

    it("loads paginated students when a class filter is selected", async () => {
        const result = await getStudentDashboardData({
            classFilter: "ม.1/1",
            page: 2,
            referredOnly: true,
            riskFilter: "green",
            schoolId: "school-1",
        });

        expect(getRiskLevelCountsQuery).toHaveBeenCalledWith(
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            {
                classFilter: "ม.1/1",
                referredOnly: true,
            },
        );
        expect(getClassCountsQuery).toHaveBeenNthCalledWith(
            1,
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            {
                referredOnly: true,
            },
        );
        expect(getClassCountsQuery).toHaveBeenNthCalledWith(
            2,
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            {
                referredOnly: true,
                riskFilter: "green",
            },
        );
        expect(getReferredStudentCountQuery).toHaveBeenCalledWith(
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            {
                classFilter: "ม.1/1",
                riskFilter: "green",
            },
        );
        expect(getStudentsForDashboardQuery).toHaveBeenCalledWith(
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            {
                classFilter: "ม.1/1",
                riskFilter: "green",
                referredOnly: true,
                page: 2,
                limit: 50,
            },
        );
        expect(result.filteredStudentCount).toBe(2);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.hasNextPage).toBe(false);
        expect(result.pagination.hasPreviousPage).toBe(false);
    });

    it("keeps class filters available when selected risk has zero matching students", async () => {
        vi.mocked(getClassCountsQuery)
            .mockResolvedValueOnce([
                { class: "ม.1/1", _count: { class: 30 } },
                { class: "ม.1/2", _count: { class: 28 } },
            ])
            .mockResolvedValueOnce([]);
        vi.mocked(getRiskLevelCountsQuery).mockResolvedValue([
            { risk_level: "blue", count: BigInt(30) },
            { risk_level: "green", count: BigInt(28) },
        ]);
        vi.mocked(getStudentsForDashboardQuery).mockResolvedValue({
            students: [],
            pagination: {
                total: 0,
                page: 1,
                limit: 50,
                totalPages: 1,
            },
        });

        const result = await getStudentDashboardData({
            classFilter: "ม.1/1",
            riskFilter: "red",
            schoolId: "school-1",
        });

        expect(result.classes).toEqual(["ม.1/1", "ม.1/2"]);
        expect(result.classOptions).toEqual([
            { name: "ม.1/1", count: 0 },
            { name: "ม.1/2", count: 0 },
        ]);
        expect(result.students).toEqual([]);
        expect(result.filteredStudentCount).toBe(0);
        expect(getStudentsForDashboardQuery).toHaveBeenCalledWith(
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            {
                classFilter: "ม.1/1",
                riskFilter: "red",
                referredOnly: false,
                page: 1,
                limit: 50,
            },
        );
    });

    it("loads students without class filter when there is only one visible class", async () => {
        vi.mocked(getClassCountsQuery).mockResolvedValue([
            { class: "ม.1/1", _count: { class: 30 } },
        ]);

        await getStudentDashboardData({
            schoolId: "school-1",
        });

        expect(getStudentsForDashboardQuery).toHaveBeenCalledWith(
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            {
                classFilter: undefined,
                riskFilter: undefined,
                referredOnly: false,
                page: 1,
                limit: 50,
            },
        );
    });

    it("normalizes invalid page and risk filter values", async () => {
        vi.mocked(getClassCountsQuery).mockResolvedValue([
            { class: "ม.1/1", _count: { class: 30 } },
        ]);

        await getStudentDashboardData({
            classFilter: "all",
            page: Number.NaN,
            riskFilter: "purple",
            schoolId: "school-1",
        });

        expect(getStudentsForDashboardQuery).toHaveBeenCalledWith(
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            {
                classFilter: undefined,
                riskFilter: undefined,
                referredOnly: false,
                page: 1,
                limit: 50,
            },
        );
    });
});
