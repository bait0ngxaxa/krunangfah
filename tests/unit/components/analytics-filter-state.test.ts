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
            selectedRound: "all",
        });

        latestFilters = applyFilterUpdates(
            latestFilters,
            { class: "ม.1/1", semester: null, round: null },
            true,
        );
        latestFilters = applyFilterUpdates(
            latestFilters,
            { year: "2569", semester: null, round: null },
            true,
        );
        latestFilters = applyFilterUpdates(
            latestFilters,
            { semester: "2", round: null },
            true,
        );
        latestFilters = applyFilterUpdates(
            latestFilters,
            { round: "1" },
            true,
        );

        expect(latestFilters).toEqual({
            school: "school-1",
            class: "ม.1/1",
            year: "2569",
            semester: "2",
            round: "1",
        });
        expect(buildFilterUrl("/analytics", latestFilters)).toBe(
            "/analytics?school=school-1&class=%E0%B8%A1.1%2F1&year=2569&semester=2&round=1",
        );
    });

    it("clears system admin filters without keeping stale query values", () => {
        const nextFilters = applyFilterUpdates(
            {
                school: "school-1",
                class: "ม.1/1",
                year: "2569",
                semester: "2",
                round: "1",
            },
            {
                school: null,
                class: null,
                year: null,
                semester: null,
                round: null,
            },
            true,
        );

        expect(nextFilters).toEqual({
            school: "",
            class: "all",
            year: "all",
            semester: "all",
            round: "all",
        });
        expect(buildFilterUrl("/analytics", nextFilters)).toBe("/analytics");
    });
});
