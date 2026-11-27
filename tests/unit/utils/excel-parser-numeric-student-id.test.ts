import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parseExcelBuffer } from "@/lib/utils/excel-parser";

const TEMPLATE_HEADERS = [
    "รหัสนักเรียน", "เลขบัตรประชาชน", "ชื่อ", "นามสกุล", "เพศกำเนิด", "อายุ (ปี)", "ห้อง",
    "ข้อ1", "ข้อ2", "ข้อ3", "ข้อ4", "ข้อ5", "ข้อ6", "ข้อ7", "ข้อ8", "ข้อ9", "opt1", "opt2",
];
const ANSWERS = Array.from({ length: 9 }, () => "ไม่มีเลย");

// Header shape of a real Google Forms response sheet: numbered q1–q9 (q9
// carries extra wording), unnumbered q9a/q9b. Every value is synthetic:
// the repository is public.
const GOOGLE_FORM_PHQ_HEADERS = [
    "1. ในช่วง 2 สัปดาห์ที่ผ่านมา รู้สึกซึม เศร้า หงุดหงิด หรือสิ้นหวัง",
    "2. ในช่วง 2 สัปดาห์ที่ผ่านมา เบื่อ ไม่ค่อยสนใจหรือเพลิดเพลินเวลาทำสิ่งต่างๆ",
    "3. ในช่วง 2 สัปดาห์ที่ผ่านมา นอนหลับยาก รู้สึกง่วงทั้งวันหรือนอนมากเกินไป",
    "4. ในช่วง 2 สัปดาห์ที่ผ่านมา ไม่อยากอาหาร น้ำหนักลด หรือกินมากกว่าปกติ",
    "5. ในช่วง 2 สัปดาห์ที่ผ่านมา รู้สึกเหนื่อยล้าหรือไม่ค่อยมีพลัง",
    "6. ในช่วง 2 สัปดาห์ที่ผ่านมา รู้สึกแย่กับตัวเอง หรือรู้สึกว่าตัวเองล้มเหลว",
    "7. ในช่วง 2 สัปดาห์ที่ผ่านมา จดจ่อกับสิ่งต่างๆได้ยาก เช่น ทำการบ้าน",
    "8. ในช่วง 2 สัปดาห์ที่ผ่านมา พูดหรือทำอะไรช้าลงมาก จนคนอื่นสังเกตุเห็นได้",
    "9. ในช่วง 2 สัปดาห์ที่ผ่านมา คิดว่าถ้าตายไปเสียจะดีกว่า หรือคิดอยากทำร้ายตัวเอง",
    "ใน 1 เดือนที่ผ่านมา มีช่วงไหนที่คุณคิดอยากตาย หรือไม่คิดอยากมีชีวิตอยู่อย่างจริงจังหรือไม่",
    "ตลอดชีวิตที่ผ่านมา คุณเคยพยายามที่ทำให้ตัวเองตายหรือลงมือฆ่าตัวตายหรือไม่",
];

interface CodeCell {
    value: ExcelJS.CellValue;
    numFmt?: string;
}

async function toArrayBuffer(workbook: ExcelJS.Workbook): Promise<ArrayBuffer> {
    const output = Buffer.from(await workbook.xlsx.writeBuffer());
    return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
}

async function createTemplateBuffer(codes: CodeCell[]): Promise<ArrayBuffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("ข้อมูลนักเรียน");
    worksheet.addRow(TEMPLATE_HEADERS);
    codes.forEach((code, index) => {
        const row = worksheet.addRow([
            code.value, "", `นักเรียน${index}`, "ทดสอบ", "ชาย", 13, "ม.1/1", ...ANSWERS, "ไม่ใช่", "ไม่ใช่",
        ]);
        if (code.numFmt !== undefined) row.getCell(1).numFmt = code.numFmt;
    });
    return toArrayBuffer(workbook);
}

async function createGoogleFormsShapedBuffer(rowCount: number): Promise<ArrayBuffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Form Responses 1");
    const columns = [
        "Timestamp", "รหัสนักเรียน", "เลขบัตรประชาชน", "ชื่อจริง", "นามสกุล", "เพศกำเนิด", "อายุ (ปี)",
        "เรียนอยู่ชั้นใด ห้องใด", ...GOOGLE_FORM_PHQ_HEADERS,
    ].map((name) => ({ name, filterButton: true }));
    const rows = Array.from({ length: rowCount }, (_, index) => [
        new Date(Date.UTC(2026, 0, 5, 8, index)),
        4100 + index,
        index === 0 ? 1103700000011 : null,
        `ทดสอบ${index}`,
        "ตัวอย่าง",
        index % 2 === 0 ? "ชาย" : "หญิง",
        14,
        "ม.2/1",
        // Row 0 gets distinct q9/q9a/q9b answers to prove each header maps to its own column.
        ...ANSWERS.slice(0, 8),
        index === 0 ? "มีแทบทุกวัน" : "ไม่มีเลย",
        index === 0 ? "ใช่" : "ไม่ใช่",
        "ไม่ใช่",
    ]);
    worksheet.addTable({ name: "FormResponses1", ref: "A1", headerRow: true, columns, rows });
    return toArrayBuffer(workbook);
}

describe("Excel parser numeric student ID provenance", () => {
    it("keeps a zero-prefixed text code exactly and without numeric provenance", async () => {
        const result = await parseExcelBuffer(await createTemplateBuffer([{ value: "00123" }]));

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0]?.studentId).toBe("00123");
        expect(result.data[0]).not.toHaveProperty("numericStudentId");
    });

    it("turns a numeric code into its decimal string without padding and records provenance", async () => {
        const result = await parseExcelBuffer(await createTemplateBuffer([{ value: 123 }]));

        expect(result.success).toBe(true);
        expect(result.data[0]).toMatchObject({ studentId: "123", numericStudentId: true });
    });

    it.each(["@", "General", "0"])("keeps provenance for a number stored in a %s cell", async (numFmt) => {
        const result = await parseExcelBuffer(await createTemplateBuffer([{ value: 4501, numFmt }]));

        expect(result.success).toBe(true);
        expect(result.data[0]).toMatchObject({ studentId: "4501", numericStudentId: true });
    });

    it("parses a mixed batch and only flags the numeric rows", async () => {
        const result = await parseExcelBuffer(
            await createTemplateBuffer([{ value: "00123" }, { value: 456 }, { value: "A-77" }]),
        );

        expect(result.success).toBe(true);
        expect(result.data.map(({ studentId, numericStudentId }) => [studentId, numericStudentId === true]))
            .toEqual([["00123", false], ["456", true], ["A-77", false]]);
    });

    it.each([
        { label: "negative", cell: { value: -123 } },
        { label: "fractional", cell: { value: 12.5 } },
        { label: "16-digit", cell: { value: 1234567890123456 } },
        { label: "unsafe integer", cell: { value: 2 ** 60 } },
        { label: "padded number format", cell: { value: 123, numFmt: "00000" } },
        { label: "thousands format", cell: { value: 1234, numFmt: "#,##0" } },
        { label: "formula", cell: { value: { formula: "100+23", result: 123 } } },
        { label: "boolean", cell: { value: true } },
    ])("rejects a $label student code", async ({ cell }) => {
        const result = await parseExcelBuffer(await createTemplateBuffer([cell]));

        expect(result.data).toHaveLength(0);
        expect(result.errors).toEqual([expect.stringContaining("กรอกเป็นข้อความให้ครบทุกหลัก")]);
    });
});

describe("Excel parser with a Google Forms response sheet structure", () => {
    it("parses every row of a table-based response sheet with numeric codes", async () => {
        const result = await parseExcelBuffer(await createGoogleFormsShapedBuffer(22));

        expect(result.errors).toEqual([]);
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(22);
        expect(result.data.every((student) => student.numericStudentId === true)).toBe(true);
        expect(result.data[0]).toMatchObject({
            studentId: "4100",
            firstName: "ทดสอบ0",
            lastName: "ตัวอย่าง",
            class: "ม.2/1",
            age: 14,
            gender: "MALE",
        });
        expect(result.data[0]?.scores).toMatchObject({ q8: 0, q9: 3, q9a: true, q9b: false });
        expect(result.data[1]?.scores).toMatchObject({ q9: 0, q9a: false, q9b: false });
    });

    it("reads a numeric national ID cell as its 13 digits and blanks as null", async () => {
        const result = await parseExcelBuffer(await createGoogleFormsShapedBuffer(2));

        expect(result.success).toBe(true);
        expect(result.data.map((student) => student.nationalId)).toEqual(["1103700000011", null]);
    });
});
