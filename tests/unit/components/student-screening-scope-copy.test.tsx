// @vitest-environment jsdom

import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// RiskPieChart is client-only (dynamic, ssr: false); render its title only.
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
    useRouter: () => ({ replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

import { StudentDashboard } from "@/components/student/dashboard/StudentDashboard";
import type { StudentDashboardProps } from "@/components/student/dashboard/types";

const TERM = { id: "term-1", year: 2568, semester: 2 };

function renderDashboard(overrides: Partial<StudentDashboardProps> = {}): string {
    const props: StudentDashboardProps = {
        students: [],
        classes: ["ม.1/1"],
        classOptions: [{ name: "ม.1/1", count: 4 }],
        riskCounts: { red: 1, orange: 0, yellow: 0, green: 3, blue: 0 },
        referredCount: 0,
        totalStudents: 4,
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
        currentAcademicYearId: TERM.id,
        availableTerms: [{ ...TERM, rounds: [1] }],
        selectedTerm: null,
        ...overrides,
    };
    return renderToStaticMarkup(<StudentDashboard {...props} />);
}

describe("screening scope copy on /students", () => {
    it("says the default view is each student's latest result", () => {
        const markup = renderDashboard();

        expect(markup).toContain(
            "<h2>ผลคัดกรองล่าสุดของนักเรียนแต่ละคน (4 คน)</h2>",
        );
        expect(markup).toContain(
            "ห้อง ม.1/1 · ผลคัดกรองล่าสุดของนักเรียนแต่ละคน",
        );
        expect(markup).not.toContain("สรุปภาพรวมนักเรียน");
    });

    it("names the selected term in the title and the summary subtitle", () => {
        const markup = renderDashboard({
            selectedTerm: TERM,
            filters: { academicYearId: TERM.id },
        });

        expect(markup).toContain("<h2>ผลคัดกรอง ปีการศึกษา 2568 เทอม 2 (4 คน)</h2>");
        expect(markup).toContain("ห้อง ม.1/1 · ผลคัดกรอง ปีการศึกษา 2568 เทอม 2");
    });
});
