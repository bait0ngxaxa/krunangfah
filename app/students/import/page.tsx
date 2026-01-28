"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExcelUploader } from "@/components/student/ExcelUploader";
import { ImportPreview } from "@/components/student/ImportPreview";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default function StudentImportPage() {
    const router = useRouter();
    const [parsedData, setParsedData] = useState<ParsedStudent[] | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleDataParsed = (data: ParsedStudent[]) => {
        setParsedData(data);
    };

    const handleCancel = () => {
        setParsedData(null);
    };

    const handleSuccess = () => {
        setShowSuccess(true);
        setParsedData(null);
        // Redirect after 2 seconds
        setTimeout(() => {
            router.push("/dashboard");
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                            นำเข้าข้อมูลนักเรียน
                        </h1>
                        <p className="text-gray-600 mt-1">
                            อัพโหลดไฟล์ Excel ที่มีข้อมูลนักเรียนและผลคะแนน
                            PHQ-A
                        </p>
                    </div>
                    <LogoutButton />
                </div>

                {/* Success Message */}
                {showSuccess && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-3">
                            <svg
                                className="w-6 h-6 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                            <p className="text-green-700 font-medium">
                                บันทึกข้อมูลสำเร็จ! กำลังกลับไปหน้า Dashboard...
                            </p>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                    {!parsedData ? (
                        <ExcelUploader onDataParsed={handleDataParsed} />
                    ) : (
                        <ImportPreview
                            data={parsedData}
                            onCancel={handleCancel}
                            onSuccess={handleSuccess}
                        />
                    )}
                </div>

                {/* Back Button */}
                <div className="mt-6">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
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
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                        กลับไปหน้า Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
