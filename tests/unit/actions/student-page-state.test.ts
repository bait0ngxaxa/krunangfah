import { describe, expect, it } from "vitest";
import {
    hasActiveStudentDashboardFilters,
    shouldShowStudentsImportEmptyState,
} from "@/components/student/dashboard/page-state";

describe("student page state helpers", () => {
    describe("hasActiveStudentDashboardFilters", () => {
        it("returns false when no filter is active", () => {
            expect(
                hasActiveStudentDashboardFilters({
                    classFilter: undefined,
                    page: undefined,
                    referredFilter: undefined,
                    riskFilter: undefined,
                }),
            ).toBe(false);
        });

        it("returns true when risk filter is active", () => {
            expect(
                hasActiveStudentDashboardFilters({
                    riskFilter: "green",
                }),
            ).toBe(true);
        });

        it("returns true when pagination is active", () => {
            expect(
                hasActiveStudentDashboardFilters({
                    page: "2",
                }),
            ).toBe(true);
        });
    });

    describe("shouldShowStudentsImportEmptyState", () => {
        it("shows import empty state only when teacher has no data and no active filters", () => {
            expect(
                shouldShowStudentsImportEmptyState({
                    hasClassOptions: false,
                    isAdmin: false,
                    totalStudents: 0,
                }),
            ).toBe(true);
        });

        it("does not show import empty state when a risk filter is active", () => {
            expect(
                shouldShowStudentsImportEmptyState({
                    hasClassOptions: false,
                    isAdmin: false,
                    riskFilter: "red",
                    totalStudents: 0,
                }),
            ).toBe(false);
        });

        it("does not show import empty state when summary data exists even if current list is empty", () => {
            expect(
                shouldShowStudentsImportEmptyState({
                    hasClassOptions: true,
                    isAdmin: false,
                    totalStudents: 30,
                }),
            ).toBe(false);
        });

        it("never shows import empty state for admins", () => {
            expect(
                shouldShowStudentsImportEmptyState({
                    hasClassOptions: false,
                    isAdmin: true,
                    totalStudents: 0,
                }),
            ).toBe(false);
        });
    });
});
