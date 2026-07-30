// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcademicYearFilter } from "@/components/student/profile/AcademicYearFilter";
import { QueryPagination } from "@/components/ui/QueryPagination";
import { Tabs, type Tab } from "@/components/ui/Tabs";

const navigation = vi.hoisted(() => ({
    pathname: "/students/student-1",
    search: "",
    replace: vi.fn(),
    push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    usePathname: () => navigation.pathname,
    useRouter: () => ({
        replace: navigation.replace,
        push: navigation.push,
    }),
    useSearchParams: () => new URLSearchParams(navigation.search),
}));

const tabs: Tab[] = [
    {
        id: "phq-results",
        label: "Results",
        content: <div>Results content</div>,
    },
    {
        id: "activities",
        label: "Activities",
        content: <div>Activities content</div>,
    },
    {
        id: "home-visits",
        label: "Home visits",
        content: <div>Home visits content</div>,
    },
];

describe("URL-synchronized tabs", () => {
    beforeEach(() => {
        navigation.search = "";
        navigation.replace.mockReset();
        navigation.push.mockReset();
    });

    it("renders a deep-linked tab and follows URL changes from navigation", () => {
        navigation.search = "tab=activities";
        const { rerender } = render(
            <Tabs tabs={tabs} defaultTab="phq-results" syncWithUrl />,
        );

        expect(screen.getByText("Activities content")).toBeTruthy();
        expect(screen.queryByText("Results content")).toBeNull();

        navigation.search = "tab=home-visits";
        rerender(
            <Tabs tabs={tabs} defaultTab="phq-results" syncWithUrl />,
        );

        expect(screen.getByText("Home visits content")).toBeTruthy();
        expect(screen.queryByText("Activities content")).toBeNull();
        expect(screen.getByRole("tab", { name: "Home visits" })).toHaveProperty(
            "ariaSelected",
            "true",
        );

        navigation.search = "tab=activities";
        rerender(
            <Tabs tabs={tabs} defaultTab="phq-results" syncWithUrl />,
        );

        expect(screen.getByText("Activities content")).toBeTruthy();
        expect(screen.queryByText("Home visits content")).toBeNull();
    });

    it("updates the URL through the router while preserving other query params", async () => {
        navigation.search = "year=year-1";
        const user = userEvent.setup();
        render(<Tabs tabs={tabs} defaultTab="phq-results" syncWithUrl />);

        await user.click(screen.getByRole("tab", { name: "Activities" }));

        expect(navigation.replace).toHaveBeenCalledWith(
            "/students/student-1?year=year-1&tab=activities",
            { scroll: false },
        );
    });
});

describe("tab-preserving query navigation", () => {
    beforeEach(() => {
        navigation.search = "";
        navigation.replace.mockReset();
        navigation.push.mockReset();
    });

    it("preserves the active tab when changing pagination", async () => {
        navigation.search = "tab=activities&year=year-1";
        const user = userEvent.setup();
        render(
            <QueryPagination page={1} totalPages={2} pageParam="counselingPage" />,
        );

        await user.click(screen.getByRole("button", { name: "ถัดไป" }));

        expect(navigation.replace).toHaveBeenCalledWith(
            "/students/student-1?tab=activities&year=year-1&counselingPage=2",
            { scroll: false },
        );
    });

    it("preserves the active tab when changing academic year", async () => {
        navigation.search = "tab=activities";
        const user = userEvent.setup();
        render(
            <AcademicYearFilter
                academicYears={[
                    { id: "year-1", year: 2568, semester: 1 },
                    { id: "year-2", year: 2567, semester: 1 },
                ]}
                currentYearId="all"
            />,
        );

        await user.selectOptions(screen.getByRole("combobox"), "year-1");

        await waitFor(() => {
            expect(navigation.push).toHaveBeenCalledWith(
                "/students/student-1?tab=activities&year=year-1",
                { scroll: false },
            );
        });
    });
});
