"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExcelUploader, ImportPreview } from "@/components/student";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { Check, FileUp } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";

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
        <div className="min-h-screen bg-slate-50 py-6 px-4 relative overflow-hidden">
            <div className="max-w-6xl mx-auto relative z-10">
                <BackButton href="/dashboard" />

                {/* Header */}
                <div className="relative bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-5 sm:p-6 mb-8 overflow-hidden group">
                    <div className="relative flex items-center gap-4">
                        {/* Animated icon */}
                        <div className="relative shrink-0">
                            <div className="relative w-12 h-12 rounded-2xl bg-[#0BD0D9] flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:bg-[#09B8C0] transition-all duration-300">
                                <FileUp className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                                <span>นำเข้าข้อมูลนักเรียน</span>
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
                    <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl shadow-sm animate-fade-in-down">
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
                <div className="relative bg-white rounded-3xl shadow-sm p-6 md:p-8 border-2 border-gray-100 overflow-hidden">
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
