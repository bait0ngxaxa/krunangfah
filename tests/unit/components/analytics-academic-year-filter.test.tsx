// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AcademicYearFilter } from "@/components/analytics/filters/AcademicYearFilter";

function renderFilter(selectedYear: string, availableYears = [2569, 2568, 2567]) {
    render(
        <AcademicYearFilter
            availableYears={availableYears}
            selectedYear={selectedYear}
            onYearChange={vi.fn()}
        />,
    );
    return screen.getByLabelText("ปีการศึกษา:") as HTMLSelectElement;
}

describe("analytics AcademicYearFilter", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        // 1 Dec 2026 = B.E. 2569 semester 2.
        vi.setSystemTime(new Date("2026-12-01T05:00:00.000Z"));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("offers no all-years option", () => {
        const select = renderFilter("2568");

        const values = Array.from(select.options).map((option) => option.value);
        expect(values).not.toContain("all");
        expect(screen.queryByText("ทุกปีการศึกษา")).toBeNull();
    });

    it("selects the URL year", () => {
        expect(renderFilter("2568").value).toBe("2568");
    });

    it.each(["all", ""])(
        "selects the current year when the year param is absent (%j)",
        (selectedYear) => {
            expect(renderFilter(selectedYear).value).toBe("2569");
        },
    );

    it("keeps an older selected year visible outside the recent-years window", () => {
        const select = renderFilter("2565", [2569, 2568, 2567, 2566, 2565]);

        expect(select.value).toBe("2565");
        expect(Array.from(select.options).map((option) => option.value)).toEqual([
            "2569",
            "2568",
            "2567",
            "2565",
            "__show_all__",
        ]);
    });

    it("lists the current year even before it has screening data", () => {
        const select = renderFilter("all", [2568, 2567]);

        expect(select.value).toBe("2569");
        expect(screen.getByText("ปี 2569 (ปัจจุบัน)")).toBeTruthy();
    });
});
