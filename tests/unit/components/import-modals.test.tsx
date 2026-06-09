import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImportErrorModal } from "@/components/student/import/ImportErrorModal";
import { FilteredStudentsWarning } from "@/components/student/import/ImportPreview/components/FilteredStudentsWarning";
import type { PreviewStudent } from "@/components/student/import/ImportPreview/types";

function createPreviewStudent(
    overrides: Partial<PreviewStudent> = {},
): PreviewStudent {
    return {
        studentId: "S001",
        nationalId: "1234567890123",
        firstName: "สมชาย",
        lastName: "ใจดี",
        gender: "MALE",
        age: 13,
        class: "ม.1/1",
        scores: {
            q1: 0,
            q2: 0,
            q3: 0,
            q4: 0,
            q5: 0,
            q6: 0,
            q7: 0,
            q8: 0,
            q9: 0,
            q9a: false,
            q9b: false,
        },
        totalScore: 0,
        riskLevel: "blue",
        _originalIndex: 0,
        ...overrides,
    };
}

describe("student import modals", () => {
    it("renders import errors as an alertdialog modal", () => {
        const html = renderToStaticMarkup(
            <ImportErrorModal
                error="กรุณาอัพโหลดไฟล์ Excel (.xlsx) เท่านั้น"
                title="อัปโหลดไฟล์ไม่สำเร็จ"
                description="กรุณาตรวจสอบรายละเอียดด้านล่างแล้วลองอีกครั้ง"
                onClose={() => undefined}
            />,
        );

        expect(html).toContain('role="alertdialog"');
        expect(html).toContain('aria-modal="true"');
        expect(html).toContain("fixed inset-0");
        expect(html).toContain("อัปโหลดไฟล์ไม่สำเร็จ");
        expect(html).toContain("กรุณาอัพโหลดไฟล์ Excel (.xlsx) เท่านั้น");
    });

    it("summarizes long import error lists so they stay readable", () => {
        const errors = Array.from(
            { length: 18 },
            (_, index) => `แถวที่ ${index + 1}: กรุณาตรวจสอบข้อมูลนักเรียน`,
        );
        const html = renderToStaticMarkup(
            <ImportErrorModal
                error={`นำเข้านักเรียนไม่สำเร็จ\n\n${errors.join("\n")}`}
                title="นำเข้านักเรียนไม่สำเร็จ"
                description="กรุณาตรวจสอบรายละเอียดด้านล่างแล้วลองอีกครั้ง"
                onClose={() => undefined}
            />,
        );

        expect(html).toContain("นำเข้านักเรียนไม่สำเร็จ");
        expect(html).toContain("พบรายละเอียดที่ต้องแก้ไข");
        expect(html).toContain("18 รายการ");
        expect(html).toContain("แสดง");
        expect(html).toContain("12");
        expect(html).toContain("รายการแรก");
        expect(html).toContain("แถวที่ 12: กรุณาตรวจสอบข้อมูลนักเรียน");
        expect(html).not.toContain(
            "แถวที่ 13: กรุณาตรวจสอบข้อมูลนักเรียน",
        );
        expect(html).toContain("ยังมีอีก");
        expect(html).toContain("6");
    });

    it("renders missing class warnings as an alertdialog modal", () => {
        const html = renderToStaticMarkup(
            <FilteredStudentsWarning
                students={[
                    createPreviewStudent({
                        class: "ม.9/9",
                        _originalIndex: 1,
                    }),
                ]}
                advisoryClass={null}
                validClassNames={["ม.1/1"]}
                isClassScoped={false}
            />,
        );

        expect(html).toContain('role="alertdialog"');
        expect(html).toContain("fixed inset-0");
        expect(html).toContain("พบห้องเรียนที่ยังไม่ได้สร้างในระบบ");
        expect(html).toContain(
            "ห้องเรียนของนักเรียนต่อไปนี้ยังไม่ถูกสร้างในระบบ",
        );
        expect(html).not.toContain("mt-4 p-4 bg-amber-50");
    });

    it("renders class_teacher out-of-scope warnings as an alertdialog modal", () => {
        const html = renderToStaticMarkup(
            <FilteredStudentsWarning
                students={[
                    createPreviewStudent({
                        class: "ม.1/2",
                        _originalIndex: 2,
                    }),
                ]}
                advisoryClass="ม.1/1"
                validClassNames={["ม.1/1", "ม.1/2"]}
                isClassScoped
            />,
        );

        expect(html).toContain('role="alertdialog"');
        expect(html).toContain("fixed inset-0");
        expect(html).toContain("พบนักเรียนที่ไม่ตรงกับห้องที่คุณดูแล");
        expect(html).toContain("นักเรียนต่อไปนี้จะไม่ถูกนำเข้า");
        expect(html).toContain("ม.1/1");
    });
});
