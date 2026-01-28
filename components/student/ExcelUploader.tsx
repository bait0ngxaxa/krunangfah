"use client";
import { useState, useRef } from "react";
import { parseExcelBuffer, type ParsedStudent } from "@/lib/utils/excel-parser";

interface ExcelUploaderProps {
    onDataParsed: (data: ParsedStudent[]) => void;
}

export function ExcelUploader({ onDataParsed }: ExcelUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setIsLoading(true);
        setError(null);

        try {
            // Validate file type
            const validTypes = [
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
            ];
            if (
                !validTypes.includes(file.type) &&
                !file.name.endsWith(".xlsx")
            ) {
                setError("กรุณาอัพโหลดไฟล์ Excel (.xlsx) เท่านั้น");
                setIsLoading(false);
                return;
            }

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
                    border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                    transition-all duration-200
                    ${
                        isDragging
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                        <p className="text-gray-600">กำลังอ่านไฟล์...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                            <svg
                                className="w-8 h-8 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-lg font-medium text-gray-700">
                                ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                รองรับไฟล์ .xlsx เท่านั้น
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 whitespace-pre-line">
                        {error}
                    </p>
                </div>
            )}

            {/* Template download info */}
            <div className="p-4 bg-gray-50 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h4 className="font-medium text-gray-700 mb-2">
                        รูปแบบไฟล์ที่รองรับ:
                    </h4>
                    <p className="text-sm text-gray-600">
                        คอลัมน์: รหัสนักเรียน, ชื่อ, นามสกุล, ห้อง, ข้อ1-ข้อ9,
                        ข้อ9a, ข้อ9b
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        * ข้อ1-ข้อ9: ค่า 0-3 | ข้อ9a, ข้อ9b: ใช่/ไม่ใช่
                    </p>
                </div>
                <a
                    href="/api/template"
                    download="phq-a-template.xlsx"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                    </svg>
                    ดาวน์โหลดไฟล์ตัวอย่าง
                </a>
            </div>
        </div>
    );
}
