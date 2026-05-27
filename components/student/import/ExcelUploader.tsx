"use client";
import { useState, useRef } from "react";
import { parseExcelBuffer, type ParsedStudent } from "@/lib/utils/excel-parser";
import { MAX_IMPORT_FILE_SIZE_BYTES } from "@/lib/constants/import";
import { Button } from "@/components/ui/Button";
import { ImportErrorModal } from "@/components/student/import/ImportErrorModal";
import {
    CheckCircle2,
    Download,
    FileSpreadsheet,
    ListChecks,
    Upload,
} from "lucide-react";

const REQUIRED_COLUMNS = [
    "รหัสนักเรียน",
    "เลขบัตรประชาชน",
    "ชื่อ",
    "นามสกุล",
    "เพศกำเนิด",
    "อายุ (ปี)",
    "ห้องเรียน",
] as const;

const REQUIRED_COLUMNS_UI = [
    ...REQUIRED_COLUMNS,
    "ผลการคัดกรอง",
] as const;

const TEMPLATE_COLUMNS = [
    ...REQUIRED_COLUMNS,
    "ในช่วง 2 สัปดาห์ที่ผ่านมา รู้สึกซึม เศร้า หงุดหงิด หรือสิ้นหวัง",
    "ในช่วง 2 สัปดาห์ที่ผ่านมา เบื่อ ไม่ค่อยสนใจหรือเพลิดเพลินเวลาทำสิ่งต่างๆ",
    "ในช่วง 2 สัปดาห์ที่ผ่านมา นอนหลับยาก รู้สึกง่วงทั้งวันหรือนอนมากเกินไป",
    "ในช่วง 2 สัปดาห์ที่ผ่านมา ไม่อยากอาหาร น้ำหนักลด หรือกินมากกว่าปกติ",
    "ในช่วง 2 สัปดาห์ที่ผ่านมา รู้สึกเหนื่อยล้าหรือไม่ค่อยมีพลัง",
    "ในช่วง 2 สัปดาห์ที่ผ่านมา รู้สึกแย่กับตัวเอง หรือรู้สึกว่าตัวเองล้มเหลว",
    "ในช่วง 2 สัปดาห์ที่ผ่านมา จดจ่อกับสิ่งต่างๆได้ยาก เช่น ทำการบ้าน",
    "ในช่วง 2 สัปดาห์ที่ผ่านมา พูดหรือทำอะไรช้าลงมาก จนคนอื่นสังเกตุเห็นได้",
    "ในช่วง 2 สัปดาห์ที่ผ่านมา คิดว่าถ้าตายไปเสียจะดีกว่า",
    "ใน 1 เดือนที่ผ่านมา มีช่วงไหนที่คุณคิดอยากตาย หรือไม่คิดอยากมีชีวิตอยู่อย่างจริงจังหรือไม่",
    "ตลอดชีวิตที่ผ่านมา คุณเคยพยายามที่ทำให้ตัวเองตายหรือลงมือฆ่าตัวตายหรือไม่",
] as const;

const TEMPLATE_EXAMPLE_ROW = [
    "68001",
    "1234567890123",
    "สมชาย",
    "ใจดี",
    "ชาย",
    "15",
    "ม.3/1",
    "ไม่มีเลย",
    "มีบางวัน",
    "ไม่มีเลย",
    "มีบางวัน",
    "ไม่มีเลย",
    "ไม่มีเลย",
    "มีบางวัน",
    "ไม่มีเลย",
    "ไม่มีเลย",
    "ไม่ใช่",
    "ไม่ใช่",
] as const;

const UPLOAD_ERROR_TITLE = "อัปโหลดไฟล์ไม่สำเร็จ";
const UPLOAD_ERROR_DESCRIPTION =
    "กรุณาตรวจสอบรายละเอียดด้านล่างแล้วลองอีกครั้ง";

async function downloadStudentImportTemplate(): Promise<void> {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Form Responses 1");

    worksheet.addRow(TEMPLATE_COLUMNS);
    worksheet.addRow(TEMPLATE_EXAMPLE_ROW);
    worksheet.columns = TEMPLATE_COLUMNS.map((header) => ({
        header,
        key: header,
        width: Math.min(Math.max(header.length + 6, 14), 48),
    }));
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "student-import-template.xlsx";
    link.click();
    URL.revokeObjectURL(url);
}

interface ExcelUploaderProps {
    onDataParsed: (data: ParsedStudent[], errors?: string[]) => void;
}

export function ExcelUploader({ onDataParsed }: ExcelUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        // Validate file type before starting loading state
        const validTypes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
        ];
        if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx")) {
            setError("กรุณาอัพโหลดไฟล์ Excel (.xlsx) เท่านั้น");
            return;
        }
        if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
            setError(
                `ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${Math.floor(MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024))}MB)`,
            );
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Read file
            const buffer = await file.arrayBuffer();
            const result = await parseExcelBuffer(buffer);

            if (!result.success && result.errors.length > 0) {
                setError(result.errors.join("\n"));
            }

            if (result.data.length > 0) {
                onDataParsed(result.data, result.errors);
            } else if (result.errors.length === 0) {
                setError("ไม่พบข้อมูลนักเรียนในไฟล์");
            }
        } catch (err) {
            console.error("File parse error:", err);
            setError("เกิดข้อผิดพลาดในการอ่านไฟล์");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleTemplateDownload = async () => {
        try {
            await downloadStudentImportTemplate();
        } catch {
            setError("ไม่สามารถดาวน์โหลด template ได้ กรุณาลองใหม่อีกครั้ง");
        }
    };

    const handleDismissError = () => {
        setError(null);
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-800">
                                เตรียมไฟล์นำเข้าข้อมูลนักเรียน
                            </h3>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-800">
                                        <FileSpreadsheet className="h-4 w-4" />
                                        ใช้ Google Form
                                    </div>
                                    <ol className="space-y-1 text-sm leading-6 text-gray-600">
                                        <li>1. เปิดชีตคำตอบของ Google Form</li>
                                        <li>
                                            2. เลือก File → Download →
                                            Microsoft Excel (.xlsx)
                                        </li>
                                        <li>3. อัปโหลดไฟล์ที่ดาวน์โหลดมา</li>
                                    </ol>
                                </div>

                                <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3">
                                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-sky-800">
                                        <ListChecks className="h-4 w-4" />
                                        กรอกเองจาก template
                                    </div>
                                    <ol className="space-y-1 text-sm leading-6 text-gray-600">
                                        <li>1. ดาวน์โหลด template Excel</li>
                                        <li>2. กรอกข้อมูลและคะแนน PHQ-A</li>
                                        <li>3. บันทึกเป็น .xlsx แล้วอัปโหลด</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 lg:w-[24rem]">
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleTemplateDownload}
                            fullWidth
                        >
                            <Download className="h-4 w-4" />
                            ดาวน์โหลด template Excel
                        </Button>
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                คอลัมน์ที่จำเป็นต้องมีในไฟล์
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {REQUIRED_COLUMNS_UI.map((column) => (
                                    <span
                                        key={column}
                                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600"
                                    >
                                        {column}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                    border-2 border-dashed rounded-2xl p-6 sm:p-12 text-center cursor-pointer
                    transition-base duration-300 transform
                    ${
                        isDragging
                            ? "border-emerald-500 bg-emerald-50 scale-102 shadow-lg shadow-emerald-100"
                            : "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-md"
                    }
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {isLoading ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
                        <p className="text-gray-600 font-medium">
                            กำลังอ่านไฟล์…
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <div
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-base duration-300 ${isDragging ? "bg-emerald-100 scale-110" : "bg-emerald-50"}`}
                        >
                            <Upload
                                className={`w-10 h-10 transition-colors ${isDragging ? "text-emerald-600" : "text-emerald-400"}`}
                            />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-700 mb-2">
                                อัปโหลดไฟล์ Excel จาก Google Form หรือ template
                            </p>
                            <p className="text-sm text-gray-500 bg-white px-4 py-1 rounded-full border border-emerald-100 inline-block">
                                ลากไฟล์ .xlsx มาวาง หรือคลิกเพื่อเลือกไฟล์
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <ImportErrorModal
                error={error}
                title={UPLOAD_ERROR_TITLE}
                description={UPLOAD_ERROR_DESCRIPTION}
                onClose={handleDismissError}
            />
        </div>
    );
}
