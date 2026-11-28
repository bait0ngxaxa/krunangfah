// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { Filter } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { FilterSelect, type FilterSelectVariant } from "@/components/ui/FilterSelect";

function renderFilter(variant?: FilterSelectVariant) {
    return render(
        <FilterSelect
            icon={Filter}
            label="ห้องเรียน"
            id="example-filter"
            value="all"
            onChange={vi.fn()}
            variant={variant}
        >
            <option value="all">ทุกห้อง</option>
        </FilterSelect>,
    );
}

describe("FilterSelect", () => {
    it("renders a labelled compact select without a card wrapper in field mode", () => {
        const { container } = renderFilter("field");

        expect(screen.getByLabelText("ห้องเรียน").classList.contains("h-10")).toBe(true);
        expect(container.querySelector("div.rounded-2xl, div.shadow-sm, [class*=glow-blob]"))
            .toBeNull();
    });

    it("preserves the existing card wrapper and select sizing by default", () => {
        const { container } = renderFilter();

        expect(container.firstElementChild?.className).toBe(
            "relative overflow-hidden rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm",
        );
        expect(container.querySelector(".glow-blob-k125")).not.toBeNull();
        const select = screen.getByLabelText("ห้องเรียน");
        expect(select.classList.contains("py-2.5")).toBe(true);
        expect(select.classList.contains("h-10")).toBe(false);
    });
});
