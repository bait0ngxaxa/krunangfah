import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";

const headerMappingSpy = vi.hoisted(() => ({ calls: 0 }));

vi.mock("@/lib/utils/excel-header-mapping", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/utils/excel-header-mapping")>();
    return {
        ...actual,
        resolveHeaderColumns: (...args: Parameters<typeof actual.resolveHeaderColumns>) => {
            headerMappingSpy.calls += 1;
            return actual.resolveHeaderColumns(...args);
        },
    };
});

const { parseExcelBuffer } = await import("@/lib/utils/excel-parser");

// Every value is synthetic: the repository is public.
type Column = readonly [header: string, value: ExcelJS.CellValue];

const NO_ANSWER = "ไม่มีเลย";
const BASE_COLUMNS: readonly Column[] = [
    ["รหัสนักเรียน", "S001"],
    ["เลขบัตรประชาชน", ""],
    ["ชื่อ", "ทดสอบ"],
    ["นามสกุล", "ตัวอย่าง"],
    ["เพศกำเนิด", "ชาย"],
    ["อายุ (ปี)", 13],
    ["ห้อง", "ม.1/1"],
    ...Array.from({ length: 9 }, (_, index): Column => [`ข้อ${index + 1}`, NO_ANSWER]),
    ["opt1", "ไม่ใช่"],
    ["opt2", "ไม่ใช่"],
];

function replaceColumn(columns: readonly Column[], header: string, replacement: readonly Column[]): Column[] {
    return columns.flatMap((column) => (column[0] === header ? [...replacement] : [column]));
}

async function toArrayBuffer(workbook: ExcelJS.Workbook): Promise<ArrayBuffer> {
    const output = Buffer.from(await workbook.xlsx.writeBuffer());
    return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
}

async function buildBuffer(columns: readonly Column[], rowCount = 1): Promise<ArrayBuffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("ข้อมูลนักเรียน");
    worksheet.addRow(columns.map(([header]) => header));
    for (let index = 0; index < rowCount; index += 1) {
        worksheet.addRow(
            columns.map(([header, value]) => (header === "รหัสนักเรียน" ? `S${100 + index}` : value)),
        );
    }
    return toArrayBuffer(workbook);
}

beforeEach(() => {
    headerMappingSpy.calls = 0;
});

describe("Excel header mapping rejects ambiguous or shared columns", () => {
    it("rejects a combined full-name column used for both first and last name", async () => {
        const columns = BASE_COLUMNS.filter(([header]) => header !== "นามสกุล");
        const result = await parseExcelBuffer(
            await buildBuffer(replaceColumn(columns, "ชื่อ", [["ชื่อ-นามสกุล", "ทดสอบ ตัวอย่าง"]])),
        );

        expect(result.success).toBe(false);
        expect(result.data).toEqual([]);
        expect(result.errors).toEqual([
            'คอลัมน์ "ชื่อ-นามสกุล" ถูกใช้เป็นทั้ง ชื่อ และ นามสกุล กรุณาแยกเป็นคอลัมน์ละหนึ่งข้อมูล',
        ]);
    });

    it("rejects two first-name-like columns when neither matches exactly", async () => {
        const result = await parseExcelBuffer(
            await buildBuffer(
                replaceColumn(BASE_COLUMNS, "ชื่อ", [
                    ["ชื่อเล่น", "เล่น"],
                    ["ชื่อ (ตามทะเบียน)", "ทดสอบ"],
                ]),
            ),
        );

        expect(result.success).toBe(false);
        expect(result.data).toEqual([]);
        expect(result.errors).toEqual([
            'พบหลายคอลัมน์ที่อาจเป็น "ชื่อ": "ชื่อเล่น", "ชื่อ (ตามทะเบียน)" กรุณาเปลี่ยนชื่อหัวคอลัมน์ให้เหลือคอลัมน์เดียว',
        ]);
    });

    it("rejects two gender-like columns when neither matches a longer alias", async () => {
        const result = await parseExcelBuffer(
            await buildBuffer(
                replaceColumn(BASE_COLUMNS, "เพศกำเนิด", [
                    ["เพศสภาพ", "หญิง"],
                    ["เพศ (ตามทะเบียน)", "ชาย"],
                ]),
            ),
        );

        expect(result.success).toBe(false);
        expect(result.data).toEqual([]);
        expect(result.errors).toEqual([
            'พบหลายคอลัมน์ที่อาจเป็น "เพศกำเนิด": "เพศสภาพ", "เพศ (ตามทะเบียน)" กรุณาเปลี่ยนชื่อหัวคอลัมน์ให้เหลือคอลัมน์เดียว',
        ]);
    });

    it("rejects duplicate exact headers for one field", async () => {
        const result = await parseExcelBuffer(
            await buildBuffer([...BASE_COLUMNS, ["ห้อง", "ม.2/2"]]),
        );

        expect(result.data).toEqual([]);
        expect(result.errors).toEqual([
            'พบหลายคอลัมน์ที่อาจเป็น "ห้องเรียน": "ห้อง", "ห้อง" กรุณาเปลี่ยนชื่อหัวคอลัมน์ให้เหลือคอลัมน์เดียว',
        ]);
    });
});

describe("Excel header mapping resolves the intended column", () => {
    it("reads first name from ชื่อจริง even when ชื่อเล่น comes first", async () => {
        const result = await parseExcelBuffer(
            await buildBuffer(
                replaceColumn(BASE_COLUMNS, "ชื่อ", [
                    ["ชื่อเล่น", "เล่น"],
                    ["ชื่อจริง", "ทดสอบจริง"],
                ]),
            ),
        );

        expect(result.errors).toEqual([]);
        expect(result.data[0]?.firstName).toBe("ทดสอบจริง");
    });

    it("reads gender from the birth-sex column via the longest alias", async () => {
        const result = await parseExcelBuffer(
            await buildBuffer(
                replaceColumn(BASE_COLUMNS, "เพศกำเนิด", [
                    ["เพศสภาพ", "ชาย"],
                    ["เพศกำเนิด (ตามทะเบียน)", "หญิง"],
                ]),
            ),
        );

        expect(result.errors).toEqual([]);
        expect(result.data[0]?.gender).toBe("FEMALE");
    });

    it("maps q1 to ข้อ1 even when ข้อ10 comes first", async () => {
        const result = await parseExcelBuffer(
            await buildBuffer(
                replaceColumn(BASE_COLUMNS, "ข้อ1", [
                    ["ข้อ10", "มีแทบทุกวัน"],
                    ["ข้อ1", NO_ANSWER],
                ]),
            ),
        );

        expect(result.errors).toEqual([]);
        expect(result.data[0]?.scores.q1).toBe(0);
    });

    it("maps every field of the shipped template to its own column", async () => {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(join(process.cwd(), "public", "examplefile.xlsx"));
        const worksheet = workbook.worksheets[0];
        worksheet.addRow([
            new Date(Date.UTC(2026, 0, 5)),
            "S200",
            "",
            "ทดสอบ",
            "ตัวอย่าง",
            "หญิง",
            14,
            "ม.2/3",
            "ไม่มีเลย",
            "มีบางวัน",
            "มีมากกว่า 7 วัน",
            "มีแทบทุกวัน",
            "ไม่มีเลย",
            "มีบางวัน",
            "มีมากกว่า 7 วัน",
            "มีแทบทุกวัน",
            "มีบางวัน",
            "ใช่",
            "ไม่ใช่",
        ]);

        const result = await parseExcelBuffer(await toArrayBuffer(workbook));

        expect(result.errors).toEqual([]);
        expect(result.data).toEqual([
            {
                studentId: "S200",
                nationalId: null,
                firstName: "ทดสอบ",
                lastName: "ตัวอย่าง",
                gender: "FEMALE",
                age: 14,
                class: "ม.2/3",
                scores: { q1: 0, q2: 1, q3: 2, q4: 3, q5: 0, q6: 1, q7: 2, q8: 3, q9: 1, q9a: true, q9b: false },
            },
        ]);
    });

    it("resolves headers once per file regardless of row count", async () => {
        const result = await parseExcelBuffer(await buildBuffer(BASE_COLUMNS, 25));

        expect(result.errors).toEqual([]);
        expect(result.data).toHaveLength(25);
        expect(headerMappingSpy.calls).toBe(1);
    });
});
