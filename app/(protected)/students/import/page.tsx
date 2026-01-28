"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExcelUploader } from "@/components/student/ExcelUploader";
import { ImportPreview } from "@/components/student/ImportPreview";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

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
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-20 right-0 w-80 h-80 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-10 left-0 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 -translate-x-1/3 pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Back Button */}
                <div className="mb-6">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-pink-50 px-4 py-2 rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>กลับหน้า Dashboard</span>
                    </Link>
                </div>

                {/* Header */}
                <div className="flex justify-between items-center mb-8 bg-white/60 backdrop-blur-sm p-5 rounded-2xl shadow-sm border border-white/50">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                            นำเข้าข้อมูลนักเรียน
                        </h1>
                        <p className="text-gray-600 mt-1 font-medium text-sm">
                            อัพโหลดไฟล์ Excel ที่มีข้อมูลนักเรียนและผลคะแนน
                            PHQ-A
                        </p>
                    </div>
                </div>

                {/* Success Message */}
                {showSuccess && (
                    <div className="mb-6 p-4 bg-green-50/90 backdrop-blur-sm border border-green-200 rounded-2xl shadow-sm animate-fade-in-down">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-full">
                                <Check className="w-6 h-6 text-green-600" />
                            </div>
                            <p className="text-green-700 font-bold">
                                บันทึกข้อมูลสำเร็จ! กำลังกลับไปหน้า Dashboard...
                            </p>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-pink-300 via-purple-300 to-blue-300" />
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
            </div>
        </div>
    );
}
