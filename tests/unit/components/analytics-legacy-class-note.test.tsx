import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
    usePathname: () => "/analytics",
    useRouter: () => ({ replace: vi.fn() }),
}));

const { AnalyticsFilters, LEGACY_CLASS_NOTE } = await import(
    "@/components/analytics/AnalyticsFilters"
);

function render(props: { showClassFilter: boolean; showLegacyClassNote?: boolean }): string {
    return renderToStaticMarkup(
        <AnalyticsFilters
            availableClasses={["ม.1/1", "ม.1/9"]}
            selectableAcademicTerms={[{ id: "term-1", year: 2568, semester: 2 }]}
            availableRounds={[1]}
            selectedSchoolId=""
            selectedClass=""
            selectedAcademicYear="2568"
            selectedSemester="2"
            selectedRound=""
            isSystemAdmin={false}
            {...props}
        />,
    );
}

describe("analytics legacy class note", () => {
    it("states the exact note text", () => {
        expect(LEGACY_CLASS_NOTE).toBe(
            "ผลคัดกรองบางส่วนในเทอมนี้นำเข้าก่อนมีการบันทึกห้อง จึงแสดงตามห้องปัจจุบันของนักเรียน",
        );
    });

    it("shows one note line near the class filter when flagged", () => {
        const html = render({ showClassFilter: true, showLegacyClassNote: true });

        expect(html.split(LEGACY_CLASS_NOTE)).toHaveLength(2);
    });

    it("shows nothing when the term has no legacy results", () => {
        expect(render({ showClassFilter: true, showLegacyClassNote: false })).not.toContain(
            LEGACY_CLASS_NOTE,
        );
    });

    it("shows nothing where there is no class filter (class teacher)", () => {
        expect(render({ showClassFilter: false, showLegacyClassNote: true })).not.toContain(
            LEGACY_CLASS_NOTE,
        );
    });
});
