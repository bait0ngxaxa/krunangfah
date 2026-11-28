// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
    replace: vi.fn(),
    search: "",
}));

vi.mock("next/navigation", () => ({
    usePathname: () => "/students",
    useRouter: () => ({ replace: navigation.replace }),
    useSearchParams: () => new URLSearchParams(navigation.search),
}));

import { TermFilter } from "@/components/student/dashboard/components/TermFilter";
import { StudentDashboardFilters } from "@/components/student/dashboard/StudentDashboardFilters";
import {
    applyDashboardFilterUpdates,
    buildDashboardQueryString,
    termChangeUpdates,
    type DashboardFilterState,
} from "@/components/student/dashboard/filter-params";
import { RISK_LEVELS } from "@/lib/constants/risk-levels";

const TERMS = [
    { id: "term-current", year: 2568, semester: 2, rounds: [1] },
    { id: "term-previous", year: 2568, semester: 1, rounds: [1, 2] },
];

function renderTermFilter(selectedTermId = "", selectedRound = "") {
    const onTermChange = vi.fn();
    const onRoundChange = vi.fn();
    render(
        <TermFilter
            availableTerms={TERMS}
            currentAcademicYearId="term-current"
            selectedTermId={selectedTermId}
            selectedRound={selectedRound}
            selectedTerm={null}
            onTermChange={onTermChange}
            onRoundChange={onRoundChange}
        />,
    );
    return { onTermChange, onRoundChange };
}

function optionLabels(select: HTMLElement): string[] {
    return within(select)
        .getAllByRole("option")
        .map((option) => option.textContent ?? "");
}

describe("TermFilter", () => {
    it("lists the latest-result view first, then terms with the current one marked", () => {
        renderTermFilter();

        expect(optionLabels(screen.getByLabelText("เลือกเทอม:"))).toEqual([
            "ทั้งหมด (ผลล่าสุด)",
            "ปีการศึกษา 2568 เทอม 2 (ปัจจุบัน)",
            "ปีการศึกษา 2568 เทอม 1",
        ]);
        expect(screen.queryByLabelText("เลือกรอบ:")).toBeNull();
    });

    it("shows a round select with only the selected term's rounds", () => {
        renderTermFilter("term-current");
        expect(optionLabels(screen.getByLabelText("เลือกรอบ:"))).toEqual([
            "ทุกรอบ",
            "รอบ 1",
        ]);
    });

    it("offers both rounds when the term has both", () => {
        renderTermFilter("term-previous", "2");
        const round = screen.getByLabelText("เลือกรอบ:");
        expect(optionLabels(round)).toEqual(["ทุกรอบ", "รอบ 1", "รอบ 2"]);
        expect((round as HTMLSelectElement).value).toBe("2");
    });

    it("is hidden with one or no terms unless a term is selected", () => {
        const { container } = render(
            <TermFilter
                availableTerms={[TERMS[0]]}
                currentAcademicYearId="term-current"
                selectedTermId=""
                selectedRound=""
                selectedTerm={null}
                onTermChange={vi.fn()}
                onRoundChange={vi.fn()}
            />,
        );
        expect(container.innerHTML).toBe("");
    });
});

describe("term filter URLs", () => {
    const current: DashboardFilterState = {
        schoolId: "school-1",
        className: "ม.1/1",
        riskFilter: "red",
        referredOnly: true,
        termId: "term-previous",
        round: "2",
        unscreenedOnly: false,
    };

    it("changing the term clears round and page and keeps the other filters", () => {
        const updates = termChangeUpdates("term-current");
        const query = buildDashboardQueryString(
            new URLSearchParams("school=school-1&class=ม.1/1&risk=red&referred=true&year=term-previous&round=2&page=3"),
            applyDashboardFilterUpdates(current, updates),
            updates,
        );
        const params = new URLSearchParams(query);

        expect(params.get("year")).toBe("term-current");
        expect(params.has("round")).toBe(false);
        expect(params.has("page")).toBe(false);
        expect(params.get("class")).toBe("ม.1/1");
        expect(params.get("risk")).toBe("red");
        expect(params.get("referred")).toBe("true");
        expect(params.get("school")).toBe("school-1");
    });

    it("choosing the latest-result view drops year and round", () => {
        const updates = termChangeUpdates("");
        const query = buildDashboardQueryString(
            new URLSearchParams("class=ม.1/1&year=term-previous&round=2"),
            applyDashboardFilterUpdates(current, updates),
            updates,
        );
        const params = new URLSearchParams(query);

        expect(params.has("year")).toBe(false);
        expect(params.has("round")).toBe(false);
        expect(params.get("class")).toBe("ม.1/1");
    });
});

describe("StudentDashboardFilters term select", () => {
    beforeEach(() => {
        navigation.replace.mockClear();
        navigation.search = "class=ม.1/1&risk=red&referred=true&round=2&page=2";
    });

    function renderFilters(selectedTermId = "", selectedRound = "") {
        render(
            <StudentDashboardFilters
                classOptions={[{ name: "ม.1/1", count: 3 }]}
                classes={["ม.1/1"]}
                isSystemAdmin={false}
                referredCount={1}
                riskCounts={{ red: 1, orange: 0, yellow: 0, green: 2, blue: 0 }}
                riskLevels={RISK_LEVELS}
                schools={[]}
                selectedClass="ม.1/1"
                selectedRiskFilter="red"
                selectedSchoolId=""
                showReferredOnly
                showRiskFilters
                totalStudents={3}
                availableTerms={TERMS}
                currentAcademicYearId="term-current"
                selectedTermId={selectedTermId}
                selectedRound={selectedRound}
            />,
        );
    }

    it("selecting a term replaces the URL without round or page", async () => {
        const user = userEvent.setup();
        renderFilters("term-previous", "2");

        await user.selectOptions(screen.getByLabelText("เลือกเทอม:"), "term-current");

        expect(navigation.replace).toHaveBeenCalledTimes(1);
        const url = navigation.replace.mock.calls[0][0] as string;
        const params = new URLSearchParams(url.split("?")[1]);
        expect(url.startsWith("/students?")).toBe(true);
        expect(params.get("year")).toBe("term-current");
        expect(params.get("class")).toBe("ม.1/1");
        expect(params.get("risk")).toBe("red");
        expect(params.get("referred")).toBe("true");
        expect(params.has("round")).toBe(false);
        expect(params.has("page")).toBe(false);
    });

    it("selecting a round keeps the term and clears the page", async () => {
        const user = userEvent.setup();
        navigation.search = "year=term-previous&page=2";
        renderFilters("term-previous");

        await user.selectOptions(screen.getByLabelText("เลือกรอบ:"), "2");

        const params = new URLSearchParams(
            (navigation.replace.mock.calls[0][0] as string).split("?")[1],
        );
        expect(params.get("year")).toBe("term-previous");
        expect(params.get("round")).toBe("2");
        expect(params.has("page")).toBe(false);
    });
});
