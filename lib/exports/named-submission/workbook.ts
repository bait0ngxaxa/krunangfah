import type { NamedSubmissionRow } from "./types";

interface NamedSubmissionColumn {
    key: keyof NamedSubmissionRow;
    header: string;
    width: number;
}

export const NAMED_SUBMISSION_COLUMNS: readonly NamedSubmissionColumn[] = [
    { key: "schoolName", header: "ชื่อโรงเรียน", width: 30 },
    { key: "province", header: "จังหวัด", width: 18 },
    { key: "studentId", header: "รหัสนักเรียน", width: 18 },
    { key: "firstName", header: "ชื่อ", width: 18 },
    { key: "lastName", header: "นามสกุล", width: 22 },
    { key: "nationalId", header: "เลขบัตรประชาชน", width: 20 },
    { key: "className", header: "ชั้น/ห้อง", width: 14 },
    { key: "studentStatus", header: "สถานะนักเรียน", width: 18 },
    { key: "academicYear", header: "ปีการศึกษา", width: 14 },
    { key: "semester", header: "เทอม", width: 10 },
    { key: "assessmentRound", header: "รอบคัดกรอง", width: 14 },
    { key: "assessmentDate", header: "วันที่คัดกรอง", width: 18 },
    { key: "totalScore", header: "คะแนนรวม PHQ-A", width: 18 },
    { key: "riskGroup", header: "กลุ่มสีความเสี่ยง", width: 20 },
    { key: "referralStatus", header: "สถานะส่งต่อ", width: 16 },
];

export async function createNamedSubmissionWorkbook(
    rows: NamedSubmissionRow[],
): Promise<Uint8Array> {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "โครงการครูนางฟ้า";

    const worksheet = workbook.addWorksheet("รายชื่อผลคัดกรอง");
    worksheet.columns = NAMED_SUBMISSION_COLUMNS.map((column) => ({
        header: column.header,
        key: column.key,
        width: column.width,
    }));
    worksheet.addRows(rows);
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = { from: "A1", to: "O1" };
    worksheet.getRow(1).font = { bold: true };
    worksheet.getColumn("studentId").numFmt = "@";
    worksheet.getColumn("nationalId").numFmt = "@";

    return new Uint8Array(await workbook.xlsx.writeBuffer());
}
