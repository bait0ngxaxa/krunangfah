/**
 * Academic Year Utility Functions
 * คำนวณปีการศึกษาและเทอมจากวันที่ปัจจุบัน
 *
 * หลักการ:
 * - ปีการศึกษาใช้ พ.ศ. (ค.ศ. ของวันเริ่มเทอม 1 + 543)
 * - เทอม 1: 1 พฤษภาคม - 31 ตุลาคม
 * - เทอม 2: 1 พฤศจิกายน - 30 เมษายน (ข้ามปี ค.ศ.)
 * - ทุกขอบเขตเป็นวันตามปฏิทิน Asia/Bangkok และต่อเนื่องกันโดยไม่มีช่องว่าง
 *
 * Thailand uses a fixed UTC+07:00 offset with no DST, so a constant offset
 * keeps date math independent of the server's TZ without a timezone library.
 */

export interface AcademicYearInfo {
    year: number; // ปีการศึกษา (พ.ศ.)
    semester: 1 | 2; // เทอม
    startDate: Date; // เวลาเที่ยงคืน Bangkok ของวันแรกของเทอม
    endDate: Date; // เวลาเที่ยงคืน Bangkok ของวันสุดท้ายของเทอม
}

export interface BangkokDateParts {
    year: number; // ปี ค.ศ.
    monthIndex: number; // 0-11
    day: number; // 1-31
}

const BANGKOK_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface SemesterBoundary {
    startMonthIndex: number;
    startDay: number;
    endYearOffset: number;
    endMonthIndex: number;
    endDay: number;
}

// The only source of term boundaries; endYearOffset is relative to the AD year semester 1 starts in.
const SEMESTER_ONE: SemesterBoundary = { startMonthIndex: 4, startDay: 1, endYearOffset: 0, endMonthIndex: 9, endDay: 31 };
const SEMESTER_TWO: SemesterBoundary = { startMonthIndex: 10, startDay: 1, endYearOffset: 1, endMonthIndex: 3, endDay: 30 };

/**
 * แปลงปี ค.ศ. เป็น พ.ศ.
 */
export function toBuddhistYear(adYear: number): number {
    return adYear + 543;
}

/**
 * แปลงปี พ.ศ. เป็น ค.ศ.
 */
function toGregorianYear(beYear: number): number {
    return beYear - 543;
}

/**
 * เวลา (UTC instant) ของเที่ยงคืนตามเวลา Bangkok ของวันที่ระบุ
 */
export function bangkokDayStart(
    adYear: number,
    monthIndex: number,
    day: number,
): Date {
    return new Date(Date.UTC(adYear, monthIndex, day) - BANGKOK_UTC_OFFSET_MS);
}

/**
 * ปี/เดือน/วัน ตามปฏิทิน Bangkok ของเวลาที่ระบุ
 */
export function getBangkokDateParts(date: Date): BangkokDateParts {
    const shifted = new Date(date.getTime() + BANGKOK_UTC_OFFSET_MS);
    return {
        year: shifted.getUTCFullYear(),
        monthIndex: shifted.getUTCMonth(),
        day: shifted.getUTCDate(),
    };
}

export function startOfBangkokDay(date: Date): Date {
    const { year, monthIndex, day } = getBangkokDateParts(date);
    return bangkokDayStart(year, monthIndex, day);
}

export function endOfBangkokDay(date: Date): Date {
    return new Date(startOfBangkokDay(date).getTime() + DAY_MS - 1);
}

function buildAcademicTerm(beYear: number, semester: 1 | 2): AcademicYearInfo {
    const adYear = toGregorianYear(beYear);
    const boundary = semester === 1 ? SEMESTER_ONE : SEMESTER_TWO;
    return {
        year: beYear,
        semester,
        startDate: bangkokDayStart(adYear, boundary.startMonthIndex, boundary.startDay),
        endDate: bangkokDayStart(
            adYear + boundary.endYearOffset,
            boundary.endMonthIndex,
            boundary.endDay,
        ),
    };
}

/**
 * คำนวณปีการศึกษาและเทอมปัจจุบันจากวันที่ (ตามปฏิทิน Bangkok)
 * @param date - วันที่ที่ต้องการคำนวณ (default: วันปัจจุบัน)
 */
export function getCurrentAcademicYear(
    date: Date = new Date(),
): AcademicYearInfo {
    const { year: adYear, monthIndex } = getBangkokDateParts(date);
    const semesterTwoStart = SEMESTER_TWO.startMonthIndex;

    if (monthIndex >= SEMESTER_ONE.startMonthIndex && monthIndex < semesterTwoStart) {
        return buildAcademicTerm(toBuddhistYear(adYear), 1);
    }

    // ม.ค. - เม.ย. เป็นเทอม 2 ของปีการศึกษาที่เริ่มในปี ค.ศ. ก่อนหน้า
    const semesterOneAdYear = monthIndex >= semesterTwoStart ? adYear : adYear - 1;
    return buildAcademicTerm(toBuddhistYear(semesterOneAdYear), 2);
}

/**
 * ตรวจว่าวันที่อยู่ในช่วงปีการศึกษาแบบรวมวันเริ่มต้นและวันสิ้นสุด (วันตาม Bangkok)
 */
export function isDateWithinAcademicYear(
    date: Date,
    academicYear: Pick<AcademicYearInfo, "startDate" | "endDate">,
): boolean {
    const startDate = startOfBangkokDay(new Date(academicYear.startDate));
    const endDate = endOfBangkokDay(new Date(academicYear.endDate));
    return date >= startDate && date <= endDate;
}

/**
 * สร้างข้อมูล Academic Year สำหรับทั้งปี (เทอม 1 และ 2)
 * @param beYear - ปี พ.ศ.
 */
export function generateAcademicYearData(beYear: number): AcademicYearInfo[] {
    return [buildAcademicTerm(beYear, 1), buildAcademicTerm(beYear, 2)];
}

/**
 * จัดรูปแบบปีการศึกษาเป็นข้อความ
 * @example "1/2569" or "เทอม 1 ปีการศึกษา 2569"
 */
export function formatAcademicYear(
    year: number,
    semester: number,
    style: "short" | "long" = "short",
): string {
    if (style === "long") {
        return `เทอม ${semester} ปีการศึกษา ${year}`;
    }
    return `${semester}/${year}`;
}
