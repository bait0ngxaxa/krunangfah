"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExcelUploader, ImportPreview } from "@/components/student";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { ArrowLeft, Check, FileUp } from "lucide-react";
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
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-6 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-20 right-0 w-80 h-80 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-10 left-0 w-80 h-80 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 -translate-x-1/3 pointer-events-none" />
            <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Back Button */}
                <div className="mb-6">
                    <Link
                        href="/dashboard"
                        className="group inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-white/80 hover:shadow-sm px-4 py-2 rounded-full border border-transparent hover:border-pink-200"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>กลับหน้า Dashboard</span>
                    </Link>
                </div>

                {/* Header */}
                <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 p-5 sm:p-6 mb-8 overflow-hidden group">
                    {/* Gradient accent bottom border */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-400 via-pink-400 to-rose-300 opacity-60" />
                    {/* Top shimmer */}
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-linear-to-br from-rose-200/20 to-pink-300/15 rounded-full blur-xl pointer-events-none" />

                    <div className="relative flex items-center gap-4">
                        {/* Animated icon */}
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                            <div className="relative w-12 h-12 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-200/50 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                                <FileUp className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                                <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                                    นำเข้าข้อมูลนักเรียน
                                </span>
                            </h1>
                            <p className="text-sm text-gray-500 truncate">
                                อัพโหลดไฟล์ Excel ที่มีข้อมูลนักเรียนและผลคะแนน
                                PHQ-A
                            </p>
                        </div>
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
                <div className="relative bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-100/50 p-6 md:p-8 border border-white/60 overflow-hidden ring-1 ring-pink-50">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-300 via-pink-300 to-orange-300" />
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-linear-to-br from-rose-200/25 to-pink-300/20 rounded-full blur-xl pointer-events-none" />
                    {/* Shimmer */}
                    <div className="absolute inset-x-0 top-[6px] h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />
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
