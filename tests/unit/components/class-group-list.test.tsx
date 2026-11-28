// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ClassGroupList } from "@/components/school/classes/components/ClassGroupList";
import type { SchoolClassItem } from "@/types/school-setup.types";

const classes: SchoolClassItem[] = [
    { id: "class-1", name: "ม.1/1", expectedStudentCount: 30 },
    { id: "class-2", name: "ม.1/2", expectedStudentCount: 25 },
    { id: "class-5", name: "ม.1/5", expectedStudentCount: null },
];

function renderList(
    onStudentCountChange = vi.fn(async () => {}),
    readOnly = false,
) {
    render(
        <ClassGroupList
            classes={classes}
            readOnly={readOnly}
            onRemove={vi.fn()}
            onStudentCountChange={onStudentCountChange}
        />,
    );
    return { onStudentCountChange };
}

describe("ClassGroupList term-scoped counts", () => {
    it("labels a class absent from the term and leaves its input empty", () => {
        renderList();

        expect(screen.getByText("ไม่มีในเทอมนี้")).toBeTruthy();
        const absentInput = screen.getByLabelText(
            "จำนวนนักเรียน ม.1/5",
        ) as HTMLInputElement;
        expect(absentInput.value).toBe("");
        const presentInput = screen.getByLabelText(
            "จำนวนนักเรียน ม.1/1",
        ) as HTMLInputElement;
        expect(presentInput.value).toBe("30");
    });

    it("counts an absent class as zero in the totals", () => {
        renderList();

        // School total (header badge) and the ม.1 grade group both sum to 55.
        expect(screen.getByText("3 ห้อง / 55 คน", { selector: "span" }))
            .toBeTruthy();
        expect(screen.getByText(/3 ห้อง\s*\/\s*55 คน/, { selector: "p" }))
            .toBeTruthy();
    });

    it("saves a count for an absent class through the existing handler", async () => {
        const { onStudentCountChange } = renderList();
        const user = userEvent.setup();
        const absentInput = screen.getByLabelText("จำนวนนักเรียน ม.1/5");

        await user.type(absentInput, "27");
        await user.tab();

        expect(onStudentCountChange).toHaveBeenCalledWith("class-5", "ม.1/5", 27);
    });

    it("does not save when the absent class input is left empty", async () => {
        const { onStudentCountChange } = renderList();
        const user = userEvent.setup();

        await user.click(screen.getByLabelText("จำนวนนักเรียน ม.1/5"));
        await user.tab();

        expect(onStudentCountChange).not.toHaveBeenCalled();
    });

    it("shows the absent label instead of a count in read-only mode", () => {
        renderList(vi.fn(async () => {}), true);

        expect(screen.getByText("ไม่มีในเทอมนี้")).toBeTruthy();
        expect(screen.getByText("30 คน")).toBeTruthy();
        expect(screen.queryByText("null คน")).toBeNull();
    });
});
