// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RiskGroupSection } from "@/components/student/phq/RiskGroupSection";

function createStudent(index: number) {
    return {
        id: `student-${index}`,
        firstName: "Student",
        lastName: String(index),
        class: "ม.1/1",
        phqResults: [{ totalScore: 10, riskLevel: "orange" }],
        referral: null,
    };
}

describe("RiskGroupSection", () => {
    it("shows a six-student preview without creating an inner scrollbar", () => {
        const markup = renderToStaticMarkup(
            <RiskGroupSection
                level="orange"
                students={Array.from({ length: 7 }, (_, index) =>
                    createStudent(index + 1),
                )}
                totalCount={12}
                viewAllHref="/students?risk=orange"
                readOnly
            />,
        );

        expect(markup).toContain("<details");
        expect(markup).not.toContain("overflow-y-auto");
        expect(markup).not.toContain("max-height");
        expect(markup).toContain("12 คน");
        expect(markup).toContain("ดูทั้งหมด 12 คน");
        expect(markup).toContain("Student 1");
        expect(markup).toContain("Student 6");
        expect(markup).not.toContain("Student 7");
    });

    it("reveals the remaining students when view all is clicked", async () => {
        const user = userEvent.setup();

        render(
            <RiskGroupSection
                level="orange"
                students={Array.from({ length: 7 }, (_, index) =>
                    createStudent(index + 1),
                )}
                totalCount={7}
                viewAllHref="/students?risk=orange"
                readOnly
            />,
        );

        await user.click(screen.getByText("เสี่ยงสูง"));
        expect(screen.queryByText("Student 7")).toBeNull();

        await user.click(
            screen.getByRole("button", { name: "ดูทั้งหมด 7 คน" }),
        );

        expect(screen.getByText("Student 7")).not.toBeNull();
    });

    it("keeps a risk group visible when its students are on another page", () => {
        const markup = renderToStaticMarkup(
            <RiskGroupSection
                level="red"
                students={[]}
                totalCount={8}
                viewAllHref="/students?risk=red"
                readOnly
            />,
        );

        expect(markup).toContain("8 คน");
        expect(markup).toContain("รายชื่อกลุ่มนี้อยู่ในหน้าอื่น");
        expect(markup).toContain("ดูทั้งหมด 8 คน");
    });
});
