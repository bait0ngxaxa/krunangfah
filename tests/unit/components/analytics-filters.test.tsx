// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
    usePathname: () => "/analytics",
    useRouter: () => ({ replace }),
}));

type FilterProps = ComponentProps<typeof AnalyticsFilters>;

const previousTerm = { id: "term-2569-1", year: 2569, semester: 1 };
const currentTerm = { id: "term-2569-2", year: 2569, semester: 2 };
const overviewTerms = [
    { id: "term-2568-1", year: 2568, semester: 1 },
    currentTerm,
    { id: "term-2568-2", year: 2568, semester: 2 },
    previousTerm,
];
const systemAdminProps = {
    schools: [{ id: "school-1", name: "โรงเรียนตัวอย่าง" }],
    availableClasses: ["ม.1/1"],
    availableRounds: [1, 2],
    selectableAcademicTerms: overviewTerms,
    isSystemAdmin: true,
    showClassFilter: true,
} satisfies Partial<FilterProps>;

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

function renderOverview(overrides: Partial<FilterProps> = {}) {
    return renderFilters({
        ...systemAdminProps,
        requireSchoolSelection: true,
        selectedSchoolId: "",
        ...overrides,
    });
}

function selectFilter(name: string, value: string): void {
    fireEvent.change(screen.getByRole("combobox", { name }), { target: { value } });
}

describe("AnalyticsFilters", () => {
    beforeEach(() => replace.mockClear());

    it("offers the empty current term and the earlier term without changing the selection", () => {
        renderFilters();

        const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "เทอม:" });
        expect(select.value).toBe("2");
        expect(within(select).getAllByRole("option").map((option) => option.textContent))
            .toEqual(["ทุกเทอม", "เทอม 1", "เทอม 2"]);
    });

    it("renders the five controls in order inside one compact card", () => {
        const { container } = renderFilters({
            ...systemAdminProps,
            selectedSchoolId: "school-1",
        });

        const card = container.firstElementChild;
        expect(card?.classList.contains("bg-white")).toBe(true);
        expect(card?.getAttribute("aria-busy")).toBe("false");
        expect(container.querySelectorAll("div.rounded-2xl, div.rounded-3xl"))
            .toHaveLength(1);
        expect(container.querySelector('[class*="glow-blob"], [class*="backdrop-blur"]'))
            .toBeNull();
        expect(screen.getAllByRole("combobox").map((select) => select.id)).toEqual([
            "school-filter",
            "class-filter",
            "year-filter-analytics",
            "semester-filter-analytics",
            "round-filter",
        ]);
        expect(screen.getAllByRole("combobox").every((select) =>
            select.classList.contains("h-10")
        )).toBe(true);
    });

    it("hides both term filters when the current term is the only choice", () => {
        renderFilters({ selectableAcademicTerms: [currentTerm] });

        expect(screen.queryByRole("combobox", { name: "ปีการศึกษา:" })).toBeNull();
        expect(screen.queryByRole("combobox", { name: "เทอม:" })).toBeNull();
    });
});

describe("system overview filters", () => {
    beforeEach(() => replace.mockClear());

    it("shows year and semester for a full-term overview without class or round controls", () => {
        renderOverview({ selectedClass: "ม.1/1", selectedRound: "1" });

        expect(screen.getByRole("combobox", { name: "ปีการศึกษา:" })).toBeTruthy();
        const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "เทอม:" });
        expect(select.value).toBe("2");
        expect(within(select).getAllByRole("option").map((option) => option.textContent))
            .toEqual(["เทอม 1", "เทอม 2"]);
        expect(screen.queryByRole("combobox", { name: /ห้องเรียน/ })).toBeNull();
        expect(screen.queryByRole("combobox", { name: "ครั้งที่:" })).toBeNull();
        expect(screen.getAllByRole("combobox")).toHaveLength(3);
    });

    it("navigates once with the latest semester of the year chosen in overview", () => {
        renderOverview({ selectedSemester: "1" });

        selectFilter("ปีการศึกษา:", "2568");

        expect(replace.mock.calls).toEqual([
            ["/analytics?year=2568&semester=2", { scroll: false }],
        ]);
    });

    it("shows the selected year and semester when the overview has one term", () => {
        renderOverview({ selectableAcademicTerms: [currentTerm] });

        expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "ปีการศึกษา:" }).value)
            .toBe("2569");
        expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "เทอม:" }).value)
            .toBe("2");
    });

    it("keeps the past term and clears class and round when selecting a school", () => {
        renderOverview({
            selectedAcademicYear: "2568",
            selectedSemester: "2",
            selectedClass: "ม.1/1",
            selectedRound: "1",
        });

        selectFilter("เลือกโรงเรียน:", "school-1");

        expect(replace.mock.calls).toEqual([
            ["/analytics?school=school-1&year=2568&semester=2", { scroll: false }],
        ]);
    });

    it.each([
        ["1", "1"],
        ["all", "2"],
    ])("clears the school from 2568/%s and opens the overview at 2568/%s", (semester, expected) => {
        renderFilters({
            ...systemAdminProps,
            selectedSchoolId: "school-1",
            selectedAcademicYear: "2568",
            selectedSemester: semester,
            selectedClass: "ม.1/1",
            selectedRound: "1",
        });

        selectFilter("เลือกโรงเรียน:", "all");

        expect(replace.mock.calls).toEqual([
            ["/analytics?year=2568&semester=" + expected, { scroll: false }],
        ]);
    });

    it("does not navigate to an incomplete overview term from a nonexistent bookmarked year", () => {
        renderFilters({
            ...systemAdminProps,
            selectedSchoolId: "school-1",
            selectedAcademicYear: "2600",
            selectedSemester: "all",
        });

        selectFilter("เลือกโรงเรียน:", "all");

        expect(replace).not.toHaveBeenCalled();
    });

    it("resets every filter to the default route", () => {
        renderFilters({
            ...systemAdminProps,
            selectedSchoolId: "school-1",
            selectedAcademicYear: "2568",
            selectedSemester: "2",
            selectedClass: "ม.1/1",
            selectedRound: "1",
        });

        fireEvent.click(screen.getByRole("button", { name: "รีเซ็ตตัวกรอง" }));

        expect(replace.mock.calls).toEqual([["/analytics", { scroll: false }]]);
    });
});
