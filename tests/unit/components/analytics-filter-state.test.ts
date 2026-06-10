import { describe, expect, it } from "vitest";
import {
    applyFilterUpdates,
    buildFilterState,
    buildFilterUrl,
    type FilterState,
} from "@/components/analytics/filter-state";

describe("analytics filter state", () => {
    it("applies rapid updates from the latest pending state", () => {
        let latestFilters: FilterState = buildFilterState({
            selectedSchoolId: "school-1",
            selectedClass: "all",
            selectedAcademicYear: "all",
            selectedSemester: "all",
        });

        latestFilters = applyFilterUpdates(
            latestFilters,
            { class: "ม.1/1", semester: null },
            true,
        );
        latestFilters = applyFilterUpdates(
            latestFilters,
            { year: "2569", semester: null },
            true,
        );
        latestFilters = applyFilterUpdates(
            latestFilters,
            { semester: "2" },
            true,
        );

        expect(latestFilters).toEqual({
            school: "school-1",
            class: "ม.1/1",
            year: "2569",
            semester: "2",
        });
        expect(buildFilterUrl("/analytics", latestFilters)).toBe(
            "/analytics?school=school-1&class=%E0%B8%A1.1%2F1&year=2569&semester=2",
        );
    });

    it("clears system admin filters without keeping stale query values", () => {
        const nextFilters = applyFilterUpdates(
            {
                school: "school-1",
                class: "ม.1/1",
                year: "2569",
                semester: "2",
            },
            {
                school: null,
                class: null,
                year: null,
                semester: null,
            },
            true,
        );

        expect(nextFilters).toEqual({
            school: "",
            class: "all",
            year: "all",
            semester: "all",
        });
        expect(buildFilterUrl("/analytics", nextFilters)).toBe("/analytics");
    });
});
