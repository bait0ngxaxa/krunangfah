/**
 * Academic Year Utility Functions
 * คำนวณปีการศึกษาและเทอมจากวันที่ปัจจุบัน
 *
 * หลักการ:
 * - ปีการศึกษาใช้ พ.ศ. (ค.ศ. + 543)
 * - เทอม 1: พฤษภาคม - ตุลาคม (เดือน 5-10)
 * - เทอม 2: พฤศจิกายน - เมษายน (เดือน 11-4, ข้ามปี ค.ศ.)
 */

export interface AcademicYearInfo {
    year: number; // ปีการศึกษา (พ.ศ.)
    semester: 1 | 2; // เทอม
    startDate: Date; // วันเริ่มเทอม
    endDate: Date; // วันสิ้นสุดเทอม
}

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
 * คำนวณปีการศึกษาและเทอมปัจจุบันจากวันที่
 * @param date - วันที่ที่ต้องการคำนวณ (default: วันปัจจุบัน)
 */
export function getCurrentAcademicYear(
    date: Date = new Date(),
): AcademicYearInfo {
    const month = date.getMonth() + 1; // 1-12
    const adYear = date.getFullYear();
    const beYear = toBuddhistYear(adYear);

    let semester: 1 | 2;
    let academicYear: number;
    let startDate: Date;
    let endDate: Date;

    if (month >= 5 && month <= 10) {
        // เทอม 1: พ.ค. - ต.ค.
        semester = 1;
        academicYear = beYear;
        startDate = new Date(adYear, 4, 15); // 15 พ.ค.
        endDate = new Date(adYear, 9, 15); // 15 ต.ค.
    } else if (month >= 11) {
        // เทอม 2 (พ.ย. - ธ.ค.) → ยังอยู่ในปีการศึกษาเดิม
        semester = 2;
        academicYear = beYear;
        startDate = new Date(adYear, 10, 1); // 1 พ.ย.
        endDate = new Date(adYear + 1, 3, 30); // 30 เม.ย. ปีถัดไป
    } else {
        // เทอม 2 (ม.ค. - เม.ย.) → ปีการศึกษาเป็นปี พ.ศ. ก่อน
        semester = 2;
        academicYear = beYear - 1;
        startDate = new Date(adYear - 1, 10, 1); // 1 พ.ย. ปีก่อน
        endDate = new Date(adYear, 3, 30); // 30 เม.ย.
    }

    return { year: academicYear, semester, startDate, endDate };
}

/**
 * ตรวจว่าวันที่อยู่ในช่วงปีการศึกษาแบบรวมวันเริ่มต้นและวันสิ้นสุด
 */
export function isDateWithinAcademicYear(
    date: Date,
    academicYear: Pick<AcademicYearInfo, "startDate" | "endDate">,
): boolean {
    const startDate = new Date(academicYear.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(academicYear.endDate);
    endDate.setHours(23, 59, 59, 999);

    return date >= startDate && date <= endDate;
}

/**
 * สร้างข้อมูล Academic Year สำหรับทั้งปี (เทอม 1 และ 2)
 * @param beYear - ปี พ.ศ.
 */
export function generateAcademicYearData(beYear: number): AcademicYearInfo[] {
    const adYear = toGregorianYear(beYear);

    return [
        {
            year: beYear,
            semester: 1,
            startDate: new Date(adYear, 4, 15), // 15 พ.ค.
            endDate: new Date(adYear, 9, 15), // 15 ต.ค.
        },
        {
            year: beYear,
            semester: 2,
            startDate: new Date(adYear, 10, 1), // 1 พ.ย.
            endDate: new Date(adYear + 1, 3, 30), // 30 เม.ย. ปีถัดไป
        },
    ];
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
