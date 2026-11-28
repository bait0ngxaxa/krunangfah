// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";

vi.mock("next/navigation", () => ({
    usePathname: () => "/analytics",
    useRouter: () => ({ replace: vi.fn() }),
}));

type FilterProps = ComponentProps<typeof AnalyticsFilters>;

const previousTerm = { id: "term-2569-1", year: 2569, semester: 1 };
const currentTerm = { id: "term-2569-2", year: 2569, semester: 2 };

function renderFilters(overrides: Partial<FilterProps> = {}) {
    return render(
        <AnalyticsFilters
            availableClasses={[]}
            selectableAcademicTerms={[currentTerm, previousTerm]}
            availableRounds={[]}
            selectedSchoolId="all"
            selectedClass="all"
            selectedAcademicYear="2569"
            selectedSemester="2"
            selectedRound="all"
            isSystemAdmin={false}
            showClassFilter={false}
            {...overrides}
        />,
    );
}

describe("AnalyticsFilters", () => {
    it("offers the empty current term and the earlier term without changing the selection", () => {
        renderFilters();

        const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "เทอม:" });
        expect(select.value).toBe("2");
        expect(within(select).getAllByRole("option").map((option) => option.textContent))
            .toEqual(["ทุกเทอม", "เทอม 1", "เทอม 2"]);
    });

    it("hides both term filters when the current term is the only choice", () => {
        renderFilters({ selectableAcademicTerms: [currentTerm] });

        expect(screen.queryByRole("combobox", { name: "ปีการศึกษา:" })).toBeNull();
        expect(screen.queryByRole("combobox", { name: "เทอม:" })).toBeNull();
    });
});
