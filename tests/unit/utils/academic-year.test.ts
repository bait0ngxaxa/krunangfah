import { describe, it, expect } from "vitest";
import {
    toBuddhistYear,
    toGregorianYear,
    getCurrentAcademicYear,
    generateAcademicYearData,
    formatAcademicYear,
} from "@/lib/utils/academic-year";

describe("toBuddhistYear", () => {
    it("should convert AD 2024 to BE 2567", () => {
        expect(toBuddhistYear(2024)).toBe(2567);
    });

    it("should convert AD 2000 to BE 2543", () => {
        expect(toBuddhistYear(2000)).toBe(2543);
    });

    it("should convert AD 1970 to BE 2513", () => {
        expect(toBuddhistYear(1970)).toBe(2513);
    });
});

describe("toGregorianYear", () => {
    it("should convert BE 2567 to AD 2024", () => {
        expect(toGregorianYear(2567)).toBe(2024);
    });

    it("should convert BE 2543 to AD 2000", () => {
        expect(toGregorianYear(2543)).toBe(2000);
    });

    it("should convert BE 2513 to AD 1970", () => {
        expect(toGregorianYear(2513)).toBe(1970);
    });
});

describe("getCurrentAcademicYear", () => {
    describe("Semester 1 (May - October)", () => {
        it("should return semester 1 for May 15, 2024", () => {
            const date = new Date(2024, 4, 15); // May 15, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(1);
            expect(result.year).toBe(2567); // BE 2567
        });

        it("should return semester 1 for June 1, 2024", () => {
            const date = new Date(2024, 5, 1); // June 1, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(1);
            expect(result.year).toBe(2567);
        });

        it("should return semester 1 for October 15, 2024", () => {
            const date = new Date(2024, 9, 15); // October 15, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(1);
            expect(result.year).toBe(2567);
        });

        it("should have correct start and end dates for semester 1", () => {
            const date = new Date(2024, 6, 1); // July 1, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.startDate.getMonth()).toBe(4); // May (0-indexed)
            expect(result.startDate.getDate()).toBe(15);
            expect(result.endDate.getMonth()).toBe(9); // October (0-indexed)
            expect(result.endDate.getDate()).toBe(15);
        });
    });

    describe("Semester 2 (November - April)", () => {
        it("should return semester 2 for November 1, 2024", () => {
            const date = new Date(2024, 10, 1); // November 1, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(2);
            expect(result.year).toBe(2567); // Still BE 2567
        });

        it("should return semester 2 for December 31, 2024", () => {
            const date = new Date(2024, 11, 31); // December 31, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(2);
            expect(result.year).toBe(2567);
        });

        it("should return semester 2 for January 1, 2025 (previous academic year)", () => {
            const date = new Date(2025, 0, 1); // January 1, 2025
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(2);
            expect(result.year).toBe(2567); // Previous academic year (BE 2567)
        });

        it("should return semester 2 for March 31, 2025", () => {
            const date = new Date(2025, 2, 31); // March 31, 2025
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(2);
            expect(result.year).toBe(2567);
        });

        it("should have correct start and end dates for semester 2 (Nov-Dec)", () => {
            const date = new Date(2024, 10, 15); // November 15, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.startDate.getMonth()).toBe(10); // November (0-indexed)
            expect(result.startDate.getDate()).toBe(1);
            expect(result.endDate.getMonth()).toBe(2); // March next year (0-indexed)
            expect(result.endDate.getDate()).toBe(31);
            expect(result.endDate.getFullYear()).toBe(2025); // Next year
        });

        it("should have correct start and end dates for semester 2 (Jan-Apr)", () => {
            const date = new Date(2025, 1, 15); // February 15, 2025
            const result = getCurrentAcademicYear(date);
            expect(result.startDate.getMonth()).toBe(10); // November previous year
            expect(result.startDate.getFullYear()).toBe(2024);
            expect(result.endDate.getMonth()).toBe(2); // March (0-indexed)
            expect(result.endDate.getDate()).toBe(31);
            expect(result.endDate.getFullYear()).toBe(2025);
        });
    });

    describe("Edge cases - Month boundaries", () => {
        it("should return semester 2 for April 30, 2024 (last day before new academic year)", () => {
            const date = new Date(2024, 3, 30); // April 30, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(2);
            expect(result.year).toBe(2566); // Previous academic year
        });

        it("should return semester 1 for May 1, 2024 (first day of new academic year)", () => {
            const date = new Date(2024, 4, 1); // May 1, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(1);
            expect(result.year).toBe(2567);
        });

        it("should return semester 1 for October 31, 2024 (last day of semester 1)", () => {
            const date = new Date(2024, 9, 31); // October 31, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(1);
            expect(result.year).toBe(2567);
        });
    });

    describe("Academic year transitions (ปีการศึกษาใหม่)", () => {
        it("should transition to NEW academic year when moving from April 30 to May 1", () => {
            // สิ้นเมษายน 2025 → ยังอยู่ปีการศึกษา 2567 เทอม 2
            const april30 = getCurrentAcademicYear(new Date(2025, 3, 30));
            expect(april30.year).toBe(2567);
            expect(april30.semester).toBe(2);

            // 1 พฤษภาคม 2025 → เข้าปีการศึกษา 2568 เทอม 1 (ปีใหม่!)
            const may1 = getCurrentAcademicYear(new Date(2025, 4, 1));
            expect(may1.year).toBe(2568);
            expect(may1.semester).toBe(1);

            // ✅ ปีการศึกษาเพิ่มขึ้น 1 ปี
            expect(may1.year).toBe(april30.year + 1);
        });

        it("should NOT transition academic year when moving from Dec 31 to Jan 1", () => {
            // 31 ธ.ค. 2025 → ปีการศึกษา 2568 เทอม 2
            const dec31 = getCurrentAcademicYear(new Date(2025, 11, 31));
            expect(dec31.year).toBe(2568);
            expect(dec31.semester).toBe(2);

            // 1 ม.ค. 2026 → ยังอยู่ปีการศึกษา 2568 เทอม 2 (ไม่เปลี่ยน)
            const jan1 = getCurrentAcademicYear(new Date(2026, 0, 1));
            expect(jan1.year).toBe(2568);
            expect(jan1.semester).toBe(2);

            // ✅ ปีการศึกษาเดิม ไม่เพิ่ม
            expect(jan1.year).toBe(dec31.year);
        });

        it("should generate correct year data for a newly transitioned academic year", () => {
            // เมื่อเข้าปีการศึกษาใหม่ 2569 ข้อมูลที่ generate ต้องถูกต้อง
            const yearData = generateAcademicYearData(2569);
            expect(yearData).toHaveLength(2);

            // เทอม 1: พ.ค. - ต.ค. 2026
            expect(yearData[0].year).toBe(2569);
            expect(yearData[0].semester).toBe(1);
            expect(yearData[0].startDate.getFullYear()).toBe(2026);
            expect(yearData[0].startDate.getMonth()).toBe(4); // May

            // เทอม 2: พ.ย. 2026 - มี.ค. 2027
            expect(yearData[1].year).toBe(2569);
            expect(yearData[1].semester).toBe(2);
            expect(yearData[1].startDate.getFullYear()).toBe(2026);
            expect(yearData[1].endDate.getFullYear()).toBe(2027);
        });

        it("should track multiple consecutive academic year transitions", () => {
            // ทดสอบว่าข้ามปีการศึกษาหลายปีต่อเนื่องถูกต้อง
            const years = [
                { date: new Date(2024, 6, 1), expectedYear: 2567 }, // Jul 2024 → 2567/1
                { date: new Date(2025, 0, 15), expectedYear: 2567 }, // Jan 2025 → 2567/2
                { date: new Date(2025, 6, 1), expectedYear: 2568 }, // Jul 2025 → 2568/1
                { date: new Date(2026, 0, 15), expectedYear: 2568 }, // Jan 2026 → 2568/2
                { date: new Date(2026, 6, 1), expectedYear: 2569 }, // Jul 2026 → 2569/1
            ];

            years.forEach(({ date, expectedYear }) => {
                const result = getCurrentAcademicYear(date);
                expect(result.year).toBe(expectedYear);
            });
        });

        it("should produce a new academic year for each May transition", () => {
            // เทียบ May ของหลายปีต่อเนื่อง - แต่ละปีต้องเพิ่ม 1
            const may2024 = getCurrentAcademicYear(new Date(2024, 4, 15));
            const may2025 = getCurrentAcademicYear(new Date(2025, 4, 15));
            const may2026 = getCurrentAcademicYear(new Date(2026, 4, 15));

            expect(may2024.year).toBe(2567);
            expect(may2025.year).toBe(2568);
            expect(may2026.year).toBe(2569);

            // แต่ละ May ต้องเพิ่มปีละ 1
            expect(may2025.year - may2024.year).toBe(1);
            expect(may2026.year - may2025.year).toBe(1);
        });

        it("should correctly identify April as still belonging to previous academic year", () => {
            // เมษายนทุกปีต้องอยู่ปีการศึกษาก่อนหน้า (เทอม 2 ของปีเก่า)
            const april2025 = getCurrentAcademicYear(new Date(2025, 3, 15));
            expect(april2025.year).toBe(2567); // ไม่ใช่ 2568
            expect(april2025.semester).toBe(2);

            const april2026 = getCurrentAcademicYear(new Date(2026, 3, 15));
            expect(april2026.year).toBe(2568); // ไม่ใช่ 2569
            expect(april2026.semester).toBe(2);
        });
    });
});

describe("generateAcademicYearData", () => {
    it("should generate both semesters for BE 2567", () => {
        const result = generateAcademicYearData(2567);
        expect(result).toHaveLength(2);
        expect(result[0].semester).toBe(1);
        expect(result[1].semester).toBe(2);
        expect(result[0].year).toBe(2567);
        expect(result[1].year).toBe(2567);
    });

    it("should have correct dates for semester 1", () => {
        const result = generateAcademicYearData(2567);
        const semester1 = result[0];
        expect(semester1.startDate.getMonth()).toBe(4); // May
        expect(semester1.startDate.getDate()).toBe(15);
        expect(semester1.endDate.getMonth()).toBe(9); // October
        expect(semester1.endDate.getDate()).toBe(15);
        expect(semester1.startDate.getFullYear()).toBe(2024); // AD 2024
    });

    it("should have correct dates for semester 2", () => {
        const result = generateAcademicYearData(2567);
        const semester2 = result[1];
        expect(semester2.startDate.getMonth()).toBe(10); // November
        expect(semester2.startDate.getDate()).toBe(1);
        expect(semester2.endDate.getMonth()).toBe(2); // March
        expect(semester2.endDate.getDate()).toBe(31);
        expect(semester2.startDate.getFullYear()).toBe(2024); // AD 2024
        expect(semester2.endDate.getFullYear()).toBe(2025); // AD 2025 (next year)
    });
});

describe("formatAcademicYear", () => {
    describe("Short format", () => {
        it('should format as "1/2567" for semester 1', () => {
            expect(formatAcademicYear(2567, 1, "short")).toBe("1/2567");
        });

        it('should format as "2/2567" for semester 2', () => {
            expect(formatAcademicYear(2567, 2, "short")).toBe("2/2567");
        });

        it("should use short format by default", () => {
            expect(formatAcademicYear(2567, 1)).toBe("1/2567");
        });
    });

    describe("Long format", () => {
        it('should format as "เทอม 1 ปีการศึกษา 2567" for semester 1', () => {
            expect(formatAcademicYear(2567, 1, "long")).toBe(
                "เทอม 1 ปีการศึกษา 2567",
            );
        });

        it('should format as "เทอม 2 ปีการศึกษา 2567" for semester 2', () => {
            expect(formatAcademicYear(2567, 2, "long")).toBe(
                "เทอม 2 ปีการศึกษา 2567",
            );
        });
    });
});
