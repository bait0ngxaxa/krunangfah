// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
    push: vi.fn(),
    search: "",
}));

vi.mock("next/navigation", () => ({
    usePathname: () => "/students/synthetic-student",
    useRouter: () => ({ push: navigation.push }),
    useSearchParams: () => new URLSearchParams(navigation.search),
}));

import { AcademicYearFilter } from "@/components/student/profile/AcademicYearFilter";

const RECENT_YEARS = [2569, 2568, 2567];
const ALL_YEARS = [...RECENT_YEARS, 2566, 2565];
const TERMS = ALL_YEARS.flatMap((year) =>
    [2, 1].map((semester) => ({ id: `term-${year}-${semester}`, year, semester })),
);

function renderFilter(currentYearId?: string): HTMLSelectElement {
    render(<AcademicYearFilter academicYears={TERMS} currentYearId={currentYearId} />);
    return screen.getByRole<HTMLSelectElement>("combobox", { name: "ปีการศึกษา:" });
}

function expectOptions(select: HTMLSelectElement, years: number[], hiddenYearsLabel?: string): void {
    expect(Array.from(select.options, (option) => option.value)).toEqual([
        "all",
        ...years.map((year) => `year:${year}`),
        ...years.flatMap((year) => [`term-${year}-2`, `term-${year}-1`]),
        ...(hiddenYearsLabel ? ["__show_all__"] : []),
    ]);

    if (hiddenYearsLabel) {
        expect(within(select).getByRole("option", { name: hiddenYearsLabel })).toBeTruthy();
    }
}

describe("student profile AcademicYearFilter", () => {
    beforeEach(() => {
        navigation.push.mockClear();
        navigation.search = "";
        vi.useFakeTimers({ toFake: ["Date"] });
        // 1 Dec 2026 = B.E. 2569 semester 2.
        vi.setSystemTime(new Date("2026-12-01T05:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("defaults to all years and lists options for the three newest years", () => {
        const select = renderFilter();

        expect(select.value).toBe("all");
        expectOptions(select, RECENT_YEARS, "ดูปีก่อนหน้านี้ (2 ปี)");
        expect(within(select).getByRole("option", { name: "ปี 2569 (ทุกเทอม) (ปัจจุบัน)" })).toBeTruthy();
        expect(within(select).getByRole("option", { name: "2569 เทอม 2 (ปัจจุบัน)" })).toBeTruthy();
    });

    it("keeps an older whole-year selection and its terms visible", () => {
        const select = renderFilter("year:2565");

        expect(select.value).toBe("year:2565");
        expectOptions(select, [...RECENT_YEARS, 2565], "ดูปีก่อนหน้านี้ (1 ปี)");
    });

    it("keeps an older term selected", () => {
        const select = renderFilter("term-2565-2");

        expect(select.value).toBe("term-2565-2");
        expectOptions(select, [...RECENT_YEARS, 2565], "ดูปีก่อนหน้านี้ (1 ปี)");
    });

    it("keeps the same options when the selected year is among the three newest", () => {
        const select = renderFilter("year:2568");

        expect(select.value).toBe("year:2568");
        expectOptions(select, RECENT_YEARS, "ดูปีก่อนหน้านี้ (2 ปี)");
    });

    it("reveals all years without navigating when the user chooses to see older years", async () => {
        const user = userEvent.setup();
        const select = renderFilter("year:2565");

        await user.selectOptions(select, "__show_all__");

        expectOptions(select, ALL_YEARS);
        expect(select.value).toBe("year:2565");
        expect(navigation.push).not.toHaveBeenCalled();
    });

    it("navigates to the selected term and clears round and PHQ pagination", async () => {
        navigation.search = "year=year%3A2568&round=2&phqPage=3&tab=phq-results";
        const user = userEvent.setup();
        const select = renderFilter("year:2568");

        await user.selectOptions(select, "term-2567-1");

        expect(navigation.push).toHaveBeenCalledExactlyOnceWith(
            "/students/synthetic-student?year=term-2567-1&tab=phq-results",
            { scroll: false },
        );
    });
});
