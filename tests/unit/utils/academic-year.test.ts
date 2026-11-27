import { describe, it, expect } from "vitest";
import {
    toBuddhistYear,
    getCurrentAcademicYear,
    generateAcademicYearData,
    formatAcademicYear,
    isDateWithinAcademicYear,
    bangkokDayStart,
    getBangkokDateParts,
    startOfBangkokDay,
    endOfBangkokDay,
} from "@/lib/utils/academic-year";

const HOUR_MS = 60 * 60 * 1000;

/** UTC instant of a Bangkok wall-clock time, so assertions never depend on the runner's TZ. */
function bkk(
    year: number,
    monthIndex: number,
    day: number,
    hours = 0,
    minutes = 0,
    seconds = 0,
    ms = 0,
): Date {
    return new Date(
        bangkokDayStart(year, monthIndex, day).getTime() +
            hours * HOUR_MS +
            minutes * 60_000 +
            seconds * 1000 +
            ms,
    );
}

function bangkokParts(date: Date): { year: number; month: number; day: number } {
    const parts = getBangkokDateParts(date);
    return { year: parts.year, month: parts.monthIndex, day: parts.day };
}

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

describe("getCurrentAcademicYear", () => {
    describe("Semester 1 (May - October)", () => {
        it("should return semester 1 for May 15, 2024", () => {
            const date = bkk(2024, 4, 15); // May 15, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(1);
            expect(result.year).toBe(2567); // BE 2567
        });

        it("should return semester 1 for June 1, 2024", () => {
            const date = bkk(2024, 5, 1); // June 1, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(1);
            expect(result.year).toBe(2567);
        });

        it("should return semester 1 for October 15, 2024", () => {
            const date = bkk(2024, 9, 15); // October 15, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(1);
            expect(result.year).toBe(2567);
        });

        it("should have correct start and end dates for semester 1", () => {
            const date = bkk(2024, 6, 1); // July 1, 2024
            const result = getCurrentAcademicYear(date);
            expect(bangkokParts(result.startDate).month).toBe(4); // May (0-indexed)
            expect(bangkokParts(result.startDate).day).toBe(1);
            expect(bangkokParts(result.endDate).month).toBe(9); // October (0-indexed)
            expect(bangkokParts(result.endDate).day).toBe(31);
        });
    });

    describe("Semester 2 (November - April)", () => {
        it("should return semester 2 for November 1, 2024", () => {
            const date = bkk(2024, 10, 1); // November 1, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(2);
            expect(result.year).toBe(2567); // Still BE 2567
        });

        it("should return semester 2 for December 31, 2024", () => {
            const date = bkk(2024, 11, 31); // December 31, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(2);
            expect(result.year).toBe(2567);
        });

        it("should return semester 2 for January 1, 2025 (previous academic year)", () => {
            const date = bkk(2025, 0, 1); // January 1, 2025
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(2);
            expect(result.year).toBe(2567); // Previous academic year (BE 2567)
        });

        it("should return semester 2 for March 31, 2025", () => {
            const date = bkk(2025, 2, 31); // March 31, 2025
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(2);
            expect(result.year).toBe(2567);
        });

        it("should have correct start and end dates for semester 2 (Nov-Apr)", () => {
            const date = bkk(2024, 10, 15); // November 15, 2024
            const result = getCurrentAcademicYear(date);
            expect(bangkokParts(result.startDate).month).toBe(10); // November (0-indexed)
            expect(bangkokParts(result.startDate).day).toBe(1);
            expect(bangkokParts(result.endDate).month).toBe(3); // April next year (0-indexed)
            expect(bangkokParts(result.endDate).day).toBe(30);
            expect(bangkokParts(result.endDate).year).toBe(2025); // Next year
        });

        it("should have correct start and end dates for semester 2 (Jan-Apr)", () => {
            const date = bkk(2025, 1, 15); // February 15, 2025
            const result = getCurrentAcademicYear(date);
            expect(bangkokParts(result.startDate).month).toBe(10); // November previous year
            expect(bangkokParts(result.startDate).year).toBe(2024);
            expect(bangkokParts(result.endDate).month).toBe(3); // April (0-indexed)
            expect(bangkokParts(result.endDate).day).toBe(30);
            expect(bangkokParts(result.endDate).year).toBe(2025);
        });
    });

    describe("Edge cases - Month boundaries", () => {
        it.each([
            {
                label: "March 31",
                date: bkk(2025, 2, 31),
                expected: {
                    year: 2567,
                    semester: 2,
                    startDate: bkk(2024, 10, 1),
                    endDate: bkk(2025, 3, 30),
                },
            },
            {
                label: "April 1",
                date: bkk(2025, 3, 1),
                expected: {
                    year: 2567,
                    semester: 2,
                    startDate: bkk(2024, 10, 1),
                    endDate: bkk(2025, 3, 30),
                },
            },
            {
                label: "April 30",
                date: bkk(2025, 3, 30),
                expected: {
                    year: 2567,
                    semester: 2,
                    startDate: bkk(2024, 10, 1),
                    endDate: bkk(2025, 3, 30),
                },
            },
            {
                label: "May 1",
                date: bkk(2025, 4, 1),
                expected: {
                    year: 2568,
                    semester: 1,
                    startDate: bkk(2025, 4, 1),
                    endDate: bkk(2025, 9, 31),
                },
            },
        ])("should classify $label at the correct academic boundary", ({ date, expected }) => {
            expect(getCurrentAcademicYear(date)).toEqual(expected);
        });

        it("should return semester 1 for October 31, 2024 (last day of semester 1)", () => {
            const date = bkk(2024, 9, 31); // October 31, 2024
            const result = getCurrentAcademicYear(date);
            expect(result.semester).toBe(1);
            expect(result.year).toBe(2567);
        });
    });

    describe("Academic year transitions (ปีการศึกษาใหม่)", () => {
        it("should transition to NEW academic year when moving from April 30 to May 1", () => {
            // สิ้นเมษายน 2025 → ยังอยู่ปีการศึกษา 2567 เทอม 2
            const april30 = getCurrentAcademicYear(bkk(2025, 3, 30));
            expect(april30.year).toBe(2567);
            expect(april30.semester).toBe(2);

            // 1 พฤษภาคม 2025 → เข้าปีการศึกษา 2568 เทอม 1 (ปีใหม่!)
            const may1 = getCurrentAcademicYear(bkk(2025, 4, 1));
            expect(may1.year).toBe(2568);
            expect(may1.semester).toBe(1);

            // ✅ ปีการศึกษาเพิ่มขึ้น 1 ปี
            expect(may1.year).toBe(april30.year + 1);
        });

        it("should NOT transition academic year when moving from Dec 31 to Jan 1", () => {
            // 31 ธ.ค. 2025 → ปีการศึกษา 2568 เทอม 2
            const dec31 = getCurrentAcademicYear(bkk(2025, 11, 31));
            expect(dec31.year).toBe(2568);
            expect(dec31.semester).toBe(2);

            // 1 ม.ค. 2026 → ยังอยู่ปีการศึกษา 2568 เทอม 2 (ไม่เปลี่ยน)
            const jan1 = getCurrentAcademicYear(bkk(2026, 0, 1));
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
            expect(bangkokParts(yearData[0].startDate).year).toBe(2026);
            expect(bangkokParts(yearData[0].startDate).month).toBe(4); // May

            // เทอม 2: พ.ย. 2026 - เม.ย. 2027
            expect(yearData[1].year).toBe(2569);
            expect(yearData[1].semester).toBe(2);
            expect(bangkokParts(yearData[1].startDate).year).toBe(2026);
            expect(bangkokParts(yearData[1].endDate).month).toBe(3); // April
            expect(bangkokParts(yearData[1].endDate).day).toBe(30);
            expect(bangkokParts(yearData[1].endDate).year).toBe(2027);
        });

        it("should track multiple consecutive academic year transitions", () => {
            // ทดสอบว่าข้ามปีการศึกษาหลายปีต่อเนื่องถูกต้อง
            const years = [
                { date: bkk(2024, 6, 1), expectedYear: 2567 }, // Jul 2024 → 2567/1
                { date: bkk(2025, 0, 15), expectedYear: 2567 }, // Jan 2025 → 2567/2
                { date: bkk(2025, 6, 1), expectedYear: 2568 }, // Jul 2025 → 2568/1
                { date: bkk(2026, 0, 15), expectedYear: 2568 }, // Jan 2026 → 2568/2
                { date: bkk(2026, 6, 1), expectedYear: 2569 }, // Jul 2026 → 2569/1
            ];

            years.forEach(({ date, expectedYear }) => {
                const result = getCurrentAcademicYear(date);
                expect(result.year).toBe(expectedYear);
            });
        });

        it("should produce a new academic year for each May transition", () => {
            // เทียบ May ของหลายปีต่อเนื่อง - แต่ละปีต้องเพิ่ม 1
            const may2024 = getCurrentAcademicYear(bkk(2024, 4, 15));
            const may2025 = getCurrentAcademicYear(bkk(2025, 4, 15));
            const may2026 = getCurrentAcademicYear(bkk(2026, 4, 15));

            expect(may2024.year).toBe(2567);
            expect(may2025.year).toBe(2568);
            expect(may2026.year).toBe(2569);

            // แต่ละ May ต้องเพิ่มปีละ 1
            expect(may2025.year - may2024.year).toBe(1);
            expect(may2026.year - may2025.year).toBe(1);
        });

        it("should correctly identify April as still belonging to previous academic year", () => {
            // เมษายนทุกปีต้องอยู่ปีการศึกษาก่อนหน้า (เทอม 2 ของปีเก่า)
            const april2025 = getCurrentAcademicYear(bkk(2025, 3, 15));
            expect(april2025.year).toBe(2567); // ไม่ใช่ 2568
            expect(april2025.semester).toBe(2);

            const april2026 = getCurrentAcademicYear(bkk(2026, 3, 15));
            expect(april2026.year).toBe(2568); // ไม่ใช่ 2569
            expect(april2026.semester).toBe(2);
        });
    });
});

describe("isDateWithinAcademicYear", () => {
    const academicYear = {
        startDate: bkk(2024, 4, 15),
        endDate: bkk(2024, 9, 15),
    };

    it("accepts dates on both inclusive boundaries", () => {
        expect(
            isDateWithinAcademicYear(academicYear.startDate, academicYear),
        ).toBe(true);
        expect(
            isDateWithinAcademicYear(
                bkk(2024, 9, 15, 23, 59, 59, 999),
                academicYear,
            ),
        ).toBe(true);
    });

    it("rejects dates outside the academic year", () => {
        expect(
            isDateWithinAcademicYear(bkk(2024, 4, 14, 23, 59, 59), academicYear),
        ).toBe(false);
        expect(
            isDateWithinAcademicYear(bkk(2024, 9, 16), academicYear),
        ).toBe(false);
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
        expect(bangkokParts(semester1.startDate).month).toBe(4); // May
        expect(bangkokParts(semester1.startDate).day).toBe(1);
        expect(bangkokParts(semester1.endDate).month).toBe(9); // October
        expect(bangkokParts(semester1.endDate).day).toBe(31);
        expect(bangkokParts(semester1.startDate).year).toBe(2024); // AD 2024
    });

    it("should have correct dates for semester 2", () => {
        const result = generateAcademicYearData(2567);
        const semester2 = result[1];
        expect(bangkokParts(semester2.startDate).month).toBe(10); // November
        expect(bangkokParts(semester2.startDate).day).toBe(1);
        expect(bangkokParts(semester2.endDate).month).toBe(3); // April
        expect(bangkokParts(semester2.endDate).day).toBe(30);
        expect(bangkokParts(semester2.startDate).year).toBe(2024); // AD 2024
        expect(bangkokParts(semester2.endDate).year).toBe(2025); // AD 2025 (next year)
    });
});

describe("Contiguous Bangkok term boundaries", () => {
    const terms = [2566, 2567, 2568].flatMap((year) => generateAcademicYearData(year));

    it.each([
        { label: "30 Apr 23:59", date: bkk(2025, 3, 30, 23, 59, 59, 999), year: 2567, semester: 2 },
        { label: "1 May 00:00", date: bkk(2025, 4, 1), year: 2568, semester: 1 },
        { label: "14 May", date: bkk(2025, 4, 14, 12), year: 2568, semester: 1 },
        { label: "15 May", date: bkk(2025, 4, 15, 12), year: 2568, semester: 1 },
        { label: "15 Oct", date: bkk(2025, 9, 15, 12), year: 2568, semester: 1 },
        { label: "16 Oct", date: bkk(2025, 9, 16, 12), year: 2568, semester: 1 },
        { label: "31 Oct 23:59", date: bkk(2025, 9, 31, 23, 59, 59, 999), year: 2568, semester: 1 },
        { label: "1 Nov 00:00", date: bkk(2025, 10, 1), year: 2568, semester: 2 },
        { label: "31 Dec", date: bkk(2025, 11, 31, 12), year: 2568, semester: 2 },
        { label: "1 Jan", date: bkk(2026, 0, 1, 12), year: 2568, semester: 2 },
        { label: "next 30 Apr 23:59", date: bkk(2026, 3, 30, 23, 59, 59, 999), year: 2568, semester: 2 },
    ])("$label falls in exactly the term getCurrentAcademicYear returns", ({ date, year, semester }) => {
        const current = getCurrentAcademicYear(date);
        const containing = terms.filter((term) => isDateWithinAcademicYear(date, term));

        expect({ year: current.year, semester: current.semester }).toEqual({ year, semester });
        expect(containing).toHaveLength(1);
        expect(containing[0]).toEqual(current);
    });

    it("returns Bangkok-midnight instants regardless of server TZ", () => {
        const semesterOne = getCurrentAcademicYear(bkk(2026, 6, 1));
        expect(semesterOne.startDate.toISOString()).toBe("2026-04-30T17:00:00.000Z");
        expect(semesterOne.endDate.toISOString()).toBe("2026-10-30T17:00:00.000Z");

        const semesterTwo = getCurrentAcademicYear(bkk(2027, 1, 1));
        expect(semesterTwo.startDate.toISOString()).toBe("2026-10-31T17:00:00.000Z");
        expect(semesterTwo.endDate.toISOString()).toBe("2027-04-29T17:00:00.000Z");
    });

    it("leaves no gap between consecutive terms", () => {
        for (let index = 1; index < terms.length; index += 1) {
            const previousEnd = endOfBangkokDay(terms[index - 1].endDate);
            const nextStart = startOfBangkokDay(terms[index].startDate);
            expect(nextStart.getTime() - previousEnd.getTime()).toBe(1);
        }
    });

    it("generateAcademicYearData matches getCurrentAcademicYear for every day", () => {
        const [semesterOne, semesterTwo] = generateAcademicYearData(2569);
        for (let day = bkk(2026, 4, 1); day <= bkk(2027, 3, 30); day = new Date(day.getTime() + 24 * HOUR_MS)) {
            const expected = day < semesterTwo.startDate ? semesterOne : semesterTwo;
            expect(getCurrentAcademicYear(day)).toEqual(expected);
            expect(getCurrentAcademicYear(new Date(day.getTime() + 24 * HOUR_MS - 1))).toEqual(expected);
        }
    });
});

describe("Bangkok day helpers", () => {
    it("maps an instant to its Bangkok calendar day", () => {
        // 2026-10-31T17:30Z is 1 Nov 00:30 in Bangkok.
        const instant = new Date("2026-10-31T17:30:00.000Z");
        expect(getBangkokDateParts(instant)).toEqual({ year: 2026, monthIndex: 10, day: 1 });
        expect(startOfBangkokDay(instant).toISOString()).toBe("2026-10-31T17:00:00.000Z");
        expect(endOfBangkokDay(instant).toISOString()).toBe("2026-11-01T16:59:59.999Z");
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
