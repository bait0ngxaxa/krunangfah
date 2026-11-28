// @vitest-environment jsdom

import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), search: "" }));

vi.mock("next/dynamic", () => ({
    default: () =>
        function PieTitle({ title }: { title: string }): ReactElement {
            return <h2>{title}</h2>;
        },
}));
vi.mock("@/components/student/referral/ReferredOutSection", () => ({
    ReferredOutSection: () => null,
}));
vi.mock("next/navigation", () => ({
    usePathname: () => "/students",
    useRouter: () => ({ replace: navigation.replace }),
    useSearchParams: () => new URLSearchParams(navigation.search),
}));

import { StudentDashboard } from "@/components/student/dashboard/StudentDashboard";
import type { StudentDashboardProps } from "@/components/student/dashboard/types";
import { UNSCREENED_THIS_YEAR_HINT } from "@/lib/constants/student-filters";

const CHIP = "ไม่มีผลคัดกรองปีการศึกษา 2568: 3 คน";

function renderDashboard(overrides: Partial<StudentDashboardProps> = {}): void {
    const props: StudentDashboardProps = {
        students: [],
        classes: ["ม.1/1"],
        classOptions: [{ name: "ม.1/1", count: 5 }],
        riskCounts: { red: 1, orange: 0, yellow: 0, green: 4, blue: 0 },
        referredCount: 0,
        totalStudents: 5,
        filteredStudentCount: 0,
        pagination: {
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
        },
        userRole: "class_teacher",
        currentAcademicYearId: "term-current",
        availableTerms: [],
        selectedTerm: null,
        currentAcademicYear: 2568,
        unscreenedThisYearCount: 3,
        unscreenedFilterApplied: false,
        ...overrides,
    };
    render(<StudentDashboard {...props} />);
}

function lastReplacedParams(): URLSearchParams {
    const url = navigation.replace.mock.calls.at(-1)?.[0] as string;
    return new URLSearchParams(url.split("?")[1] ?? "");
}

describe("unscreened this academic year chip", () => {
    beforeEach(() => {
        navigation.replace.mockClear();
        navigation.search = "class=ม.1/1&risk=red&page=2";
    });

    it("shows the chip with the year and count in the default view", () => {
        renderDashboard();

        const chip = screen.getByRole("button", { name: CHIP });
        expect(chip.getAttribute("aria-pressed")).toBe("false");
        expect(screen.queryByText(UNSCREENED_THIS_YEAR_HINT)).toBeNull();
    });

    it("is hidden when the count is 0", () => {
        renderDashboard({ unscreenedThisYearCount: 0 });

        expect(screen.queryByText(/ไม่มีผลคัดกรองปีการศึกษา/)).toBeNull();
    });

    it("is hidden when a term is selected", () => {
        renderDashboard({
            filters: { academicYearId: "term-current" },
            selectedTerm: { id: "term-current", year: 2568, semester: 2 },
        });

        expect(screen.queryByText(/ไม่มีผลคัดกรองปีการศึกษา/)).toBeNull();
    });

    it("toggling on sets unscreened=year, clears page and keeps the other filters", async () => {
        const user = userEvent.setup();
        renderDashboard({ filters: { className: "ม.1/1", riskLevel: "red" } });

        await user.click(screen.getByRole("button", { name: CHIP }));

        const params = lastReplacedParams();
        expect(params.get("unscreened")).toBe("year");
        expect(params.has("page")).toBe(false);
        expect(params.get("class")).toBe("ม.1/1");
        expect(params.get("risk")).toBe("red");
    });

    it("shows the helper text only while the filter is on, and toggling off removes it from the URL", async () => {
        const user = userEvent.setup();
        navigation.search = "unscreened=year";
        renderDashboard({
            filters: { unscreened: "year" },
            unscreenedFilterApplied: true,
        });

        expect(screen.getByText(UNSCREENED_THIS_YEAR_HINT)).toBeTruthy();
        const chip = screen.getByRole("button", { name: CHIP });
        expect(chip.getAttribute("aria-pressed")).toBe("true");

        await user.click(chip);
        expect(lastReplacedParams().has("unscreened")).toBe(false);
    });

    it("stays visible while on even if the count drops to 0, so it can be switched off", () => {
        renderDashboard({
            filters: { unscreened: "year" },
            unscreenedFilterApplied: true,
            unscreenedThisYearCount: 0,
        });

        expect(
            screen.getByRole("button", { name: "ไม่มีผลคัดกรองปีการศึกษา 2568: 0 คน" }),
        ).toBeTruthy();
    });
});
