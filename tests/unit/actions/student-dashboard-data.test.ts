import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
    academicYearFindUnique: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        academicYear: { findUnique: prismaMocks.academicYearFindUnique },
    },
}));

vi.mock("@/lib/auth/viewer-context", () => ({
    getViewerContext: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
    isSystemAdmin: vi.fn((role: string) => role === "system_admin"),
}));

vi.mock("@/lib/actions/student/queries", () => ({
    getClassCountsQuery: vi.fn(),
    getReferredStudentCountQuery: vi.fn(),
    getRiskLevelCountsQuery: vi.fn(),
    getStudentsForDashboardQuery: vi.fn(),
}));

vi.mock("@/lib/actions/student/term-queries", () => ({
    getAvailableTermsQuery: vi.fn(),
    getCurrentAcademicYearIdQuery: vi.fn(),
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
import {
    getAvailableTermsQuery,
    getCurrentAcademicYearIdQuery,
} from "@/lib/actions/student/term-queries";
import { getStudentDashboardData } from "@/lib/actions/student/dashboard";
import type { ViewerContext } from "@/lib/auth/viewer-context";
import type { QueryResult } from "@/lib/actions/query-result";

function getQueryData<T>(result: QueryResult<T>): T {
    if (result.status === "success" || result.status === "empty") return result.data;
    throw new Error(`Expected query data, received ${result.status}`);
}

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
        phqResults: [
            { totalScore: 5, riskLevel, assessmentRound: 1, academicYear: { id: "term-1", year: 2568, semester: 1 } },
        ],
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
        prismaMocks.academicYearFindUnique.mockResolvedValue({
            isCurrent: false,
        });
        vi.mocked(getCurrentAcademicYearIdQuery).mockResolvedValue(null);
        vi.mocked(getAvailableTermsQuery).mockResolvedValue([]);
    });

    it("returns empty data for system admin without selected school", async () => {
        vi.mocked(getViewerContext).mockResolvedValue({
            ...baseViewer,
            isPrimary: false,
            role: "system_admin",
            schoolId: undefined,
        });

        const result = await getStudentDashboardData();
        const data = getQueryData(result);

        expect(data.students).toEqual([]);
        expect(data.totalStudents).toBe(0);
        expect(getClassCountsQuery).not.toHaveBeenCalled();
        expect(getStudentsForDashboardQuery).not.toHaveBeenCalled();
    });

    it("skips student list query when multiple classes are visible and no class is selected", async () => {
        const result = await getStudentDashboardData({
            schoolId: "school-1",
        });
        const data = getQueryData(result);

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
        expect(data.students).toEqual([]);
        expect(data.pagination.total).toBe(0);
        expect(data.totalStudents).toBe(58);
    });

    it("loads paginated students when a class filter is selected", async () => {
        const result = await getStudentDashboardData({
            classFilter: "ม.1/1",
            page: 2,
            referredOnly: true,
            riskFilter: "green",
            schoolId: "school-1",
        });
        const data = getQueryData(result);

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
        expect(data.filteredStudentCount).toBe(2);
        expect(data.pagination.page).toBe(1);
        expect(data.pagination.hasNextPage).toBe(false);
        expect(data.pagination.hasPreviousPage).toBe(false);
    });

    it("passes the selected academic term to every dashboard query", async () => {
        const academicYearId = "cm123456789012345678901234";

        await getStudentDashboardData({
            academicYearId,
            assessmentRound: 2,
            classFilter: "ม.1/1",
            schoolId: "school-1",
        });

        expect(getClassCountsQuery).toHaveBeenNthCalledWith(
            1,
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            {
                academicYearId,
                assessmentRound: 2,
                currentPopulationOnly: false,
                referredOnly: false,
            },
        );
        expect(getRiskLevelCountsQuery).toHaveBeenCalledWith(
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            {
                academicYearId,
                assessmentRound: 2,
                classFilter: "ม.1/1",
                currentPopulationOnly: false,
                referredOnly: false,
            },
        );
        expect(getStudentsForDashboardQuery).toHaveBeenCalledWith(
            "school-1",
            "ม.1/1",
            "school_admin",
            "user-1",
            {
                academicYearId,
                assessmentRound: 2,
                classFilter: "ม.1/1",
                currentPopulationOnly: false,
                limit: 50,
                page: 1,
                referredOnly: false,
                riskFilter: undefined,
            },
        );
        expect(prismaMocks.academicYearFindUnique).toHaveBeenCalledWith({
            where: { id: academicYearId },
            select: { id: true, year: true, semester: true, isCurrent: true },
        });
    });

    it("returns the current term, visible terms and the selected term", async () => {
        const academicYearId = "cm123456789012345678901234";
        const availableTerms = [
            { id: academicYearId, year: 2568, semester: 2, rounds: [1, 2] },
            { id: "cm999999999999999999999999", year: 2568, semester: 1, rounds: [1] },
        ];
        vi.mocked(getCurrentAcademicYearIdQuery).mockResolvedValue(academicYearId);
        vi.mocked(getAvailableTermsQuery).mockResolvedValue(availableTerms);
        prismaMocks.academicYearFindUnique.mockResolvedValue({
            id: academicYearId,
            year: 2568,
            semester: 2,
            isCurrent: true,
        });

        const selected = getQueryData(
            await getStudentDashboardData({ academicYearId, classFilter: "ม.1/1" }),
        );
        const latest = getQueryData(
            await getStudentDashboardData({ classFilter: "ม.1/1" }),
        );

        expect(getAvailableTermsQuery).toHaveBeenCalledWith(
            "school-1",
            "ม.1/1",
            "school_admin",
        );
        for (const data of [selected, latest]) {
            expect(data.currentAcademicYearId).toBe(academicYearId);
            expect(data.availableTerms).toEqual(availableTerms);
        }
        expect(selected.selectedTerm).toEqual({
            id: academicYearId,
            year: 2568,
            semester: 2,
        });
        expect(latest.selectedTerm).toBeNull();
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
        const data = getQueryData(result);

        expect(data.classes).toEqual(["ม.1/1", "ม.1/2"]);
        expect(data.classOptions).toEqual([
            { name: "ม.1/1", count: 0 },
            { name: "ม.1/2", count: 0 },
        ]);
        expect(data.students).toEqual([]);
        expect(data.filteredStudentCount).toBe(0);
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

    it("returns empty dashboard data when a class teacher requests another class", async () => {
        vi.mocked(getViewerContext).mockResolvedValue({
            ...baseViewer,
            role: "class_teacher",
        });

        const result = await getStudentDashboardData({
            classFilter: "ม.1/2",
            riskFilter: "red",
            referredOnly: true,
        });

        expect(result.status).toBe("empty");
        const data = getQueryData(result);
        expect(data.students).toEqual([]);
        expect(data.classes).toEqual([]);
        expect(data.totalStudents).toBe(0);
        expect(data.referredCount).toBe(0);
        expect(getClassCountsQuery).not.toHaveBeenCalled();
        expect(getRiskLevelCountsQuery).not.toHaveBeenCalled();
        expect(getReferredStudentCountQuery).not.toHaveBeenCalled();
        expect(getStudentsForDashboardQuery).not.toHaveBeenCalled();
        expect(prismaMocks.academicYearFindUnique).not.toHaveBeenCalled();
        expect(getAvailableTermsQuery).not.toHaveBeenCalled();
        expect(data.availableTerms).toEqual([]);
        expect(data.currentAcademicYearId).toBeNull();
        expect(data.selectedTerm).toBeNull();
    });

    it("lets a class teacher filter by their own advisory class", async () => {
        vi.mocked(getViewerContext).mockResolvedValue({
            ...baseViewer,
            role: "class_teacher",
        });

        await getStudentDashboardData({ classFilter: "ม.1/1" });

        expect(getStudentsForDashboardQuery).toHaveBeenCalledWith(
            "school-1",
            "ม.1/1",
            "class_teacher",
            "user-1",
            expect.objectContaining({ classFilter: "ม.1/1" }),
        );
    });

    it("returns transient_error instead of empty dashboard data when a query fails", async () => {
        vi.mocked(getRiskLevelCountsQuery).mockRejectedValue(
            new Error("database unavailable"),
        );

        const result = await getStudentDashboardData({ schoolId: "school-1" });

        expect(result).toEqual({
            status: "transient_error",
            requestId: expect.any(String),
            message: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        });
        expect(result).not.toHaveProperty("students");
    });
});
