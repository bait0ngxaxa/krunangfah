import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("ข้อมูลนักเรียน");

        // Define headers
        const headers = [
            "รหัสนักเรียน",
            "ชื่อ",
            "นามสกุล",
            "เพศ",
            "อายุ",
            "ห้อง",
            "ข้อ1",
            "ข้อ2",
            "ข้อ3",
            "ข้อ4",
            "ข้อ5",
            "ข้อ6",
            "ข้อ7",
            "ข้อ8",
            "ข้อ9",
            "opt1",
            "opt2",
        ];

        // Add header row with styling
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4F81BD" },
        };
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

        // Set column widths
        worksheet.columns = [
            { width: 15 }, // รหัสนักเรียน
            { width: 15 }, // ชื่อ
            { width: 15 }, // นามสกุล
            { width: 8 }, // เพศ
            { width: 8 }, // อายุ
            { width: 10 }, // ห้อง
            { width: 8 }, // ข้อ1
            { width: 8 }, // ข้อ2
            { width: 8 }, // ข้อ3
            { width: 8 }, // ข้อ4
            { width: 8 }, // ข้อ5
            { width: 8 }, // ข้อ6
            { width: 8 }, // ข้อ7
            { width: 8 }, // ข้อ8
            { width: 8 }, // ข้อ9
            { width: 10 }, // opt1
            { width: 10 }, // opt2
        ];

        // Add sample data
        const sampleData = [
            [
                "12345",
                "สมชาย",
                "ใจดี",
                "ชาย",
                13,
                "ม.1/1",
                1,
                0,
                1,
                0,
                0,
                1,
                0,
                0,
                0,
                "ไม่ใช่",
                "ไม่ใช่",
            ],
            [
                "12346",
                "สมหญิง",
                "รักเรียน",
                "หญิง",
                13,
                "ม.1/1",
                2,
                1,
                1,
                0,
                1,
                0,
                0,
                1,
                0,
                "ไม่ใช่",
                "ไม่ใช่",
            ],
            [
                "12347",
                "สมศักดิ์",
                "เก่งมาก",
                "ชาย",
                14,
                "ม.1/2",
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                "ไม่ใช่",
                "ไม่ใช่",
            ],
            [
                "12348",
                "สมปอง",
                "ดีใจ",
                "หญิง",
                14,
                "ม.1/2",
                2,
                2,
                2,
                1,
                2,
                1,
                1,
                2,
                2,
                "ไม่ใช่",
                "ไม่ใช่",
            ],
        ];

        sampleData.forEach((row) => {
            worksheet.addRow(row);
        });

        // Add instruction sheet
        const instructionSheet = workbook.addWorksheet("คำอธิบาย");
        instructionSheet.addRow(["คำอธิบายการกรอกข้อมูล"]);
        instructionSheet.addRow([""]);
        instructionSheet.addRow(["คอลัมน์", "คำอธิบาย", "ค่าที่รับ"]);
        instructionSheet.addRow([
            "รหัสนักเรียน",
            "รหัสประจำตัวนักเรียน (ไม่บังคับ)",
            "ตัวเลข",
        ]);
        instructionSheet.addRow(["ชื่อ", "ชื่อนักเรียน", "ข้อความ"]);
        instructionSheet.addRow(["นามสกุล", "นามสกุลนักเรียน", "ข้อความ"]);
        instructionSheet.addRow(["เพศ", "เพศของนักเรียน", "ชาย / หญิง"]);
        instructionSheet.addRow([
            "อายุ",
            "อายุของนักเรียน (ปี)",
            "ตัวเลข เช่น 13, 14",
        ]);
        instructionSheet.addRow(["ห้อง", "ห้องเรียน", "เช่น ม.1/1"]);
        instructionSheet.addRow(["ข้อ1-ข้อ9", "คะแนนแต่ละข้อ", "0, 1, 2, 3"]);
        instructionSheet.addRow([
            "opt1",
            "มีความคิดทำร้ายตัวเอง",
            "ใช่ / ไม่ใช่",
        ]);
        instructionSheet.addRow([
            "opt2",
            "มีความคิดทำร้ายผู้อื่น",
            "ใช่ / ไม่ใช่",
        ]);
        instructionSheet.addRow([""]);
        instructionSheet.addRow(["เกณฑ์คะแนน PHQ-A:"]);
        instructionSheet.addRow(["0-4 คะแนน", "ฟ้า", "ปกติ"]);
        instructionSheet.addRow(["5-9 คะแนน", "เขียว", "เฝ้าระวังเล็กน้อย"]);
        instructionSheet.addRow(["10-14 คะแนน", "เหลือง", "เฝ้าระวังปานกลาง"]);
        instructionSheet.addRow(["15-19 คะแนน", "ส้ม", "มีความเสี่ยง"]);
        instructionSheet.addRow([
            "20-27 คะแนน หรือ opt1/opt2 ตอบใช่",
            "แดง",
            "ความเสี่ยงสูง",
        ]);

        instructionSheet.getColumn(1).width = 35;
        instructionSheet.getColumn(2).width = 25;
        instructionSheet.getColumn(3).width = 25;

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Return as file download
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition":
                    "attachment; filename=phq-a-template.xlsx",
            },
        });
    } catch (error) {
        console.error("Generate template error:", error);
        return NextResponse.json(
            { error: "Failed to generate template" },
            { status: 500 },
        );
    }
}
