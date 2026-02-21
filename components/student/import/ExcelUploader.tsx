"use client";
import { useState, useRef } from "react";
import { parseExcelBuffer, type ParsedStudent } from "@/lib/utils/excel-parser";
import { Upload, Download, Info } from "lucide-react";

interface ExcelUploaderProps {
    onDataParsed: (data: ParsedStudent[]) => void;
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
                onDataParsed(result.data);
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

    return (
        <div className="space-y-4">
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                    border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
                    transition-all duration-300 transform
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
                            กำลังอ่านไฟล์...
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <div
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isDragging ? "bg-emerald-100 scale-110" : "bg-emerald-50"}`}
                        >
                            <Upload
                                className={`w-10 h-10 transition-colors ${isDragging ? "text-emerald-600" : "text-emerald-400"}`}
                            />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-700 mb-2">
                                ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                            </p>
                            <p className="text-sm text-gray-500 bg-white/60 px-4 py-1 rounded-full border border-emerald-100 inline-block">
                                รองรับไฟล์ .xlsx เท่านั้น
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl animate-fade-in-up">
                    <p className="text-sm text-red-600 whitespace-pre-line font-medium text-center">
                        {error}
                    </p>
                </div>
            )}

            {/* Template download info */}
            <div className="p-6 bg-linear-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-md rounded-2xl border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                <div>
                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-500 shrink-0" />{" "}
                        รูปแบบไฟล์ที่รองรับ
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        คอลัมน์:{" "}
                        <span className="font-medium text-gray-800">
                            รหัสนักเรียน, ชื่อ, นามสกุล, เพศ,อายุ,ห้อง,
                            ข้อ1-ข้อ9, ข้อ9a, ข้อ9b
                        </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2 bg-white/50 inline-block px-2 py-1 rounded-md border border-white/50">
                        * ข้อ1-ข้อ9: ค่า 0-3 | ข้อ9a, ข้อ9b: ใช่/ไม่ใช่
                    </p>
                </div>
                <a
                    href="/api/template"
                    download="phq-a-template.xlsx"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all text-sm font-bold whitespace-nowrap shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                    <Download className="w-5 h-5" />
                    ดาวน์โหลดไฟล์ตัวอย่าง
                </a>
            </div>
        </div>
    );
}
