"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExcelUploader, ImportPreview } from "@/components/student";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { PageBanner } from "@/components/ui/PageBanner";

export default function StudentImportPage() {
    const router = useRouter();
    const [parsedData, setParsedData] = useState<ParsedStudent[] | null>(null);

    const handleDataParsed = (data: ParsedStudent[]) => {
        setParsedData(data);
    };

    const handleCancel = () => {
        setParsedData(null);
    };

    const handleSuccess = () => {
        setParsedData(null);
        toast.success("บันทึกข้อมูลสำเร็จ!", {
            description: "กำลังกลับไปหน้า Dashboard...",
        });
        setTimeout(() => {
            router.push("/dashboard");
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            <PageBanner
                title="นำเข้าข้อมูลนักเรียน"
                subtitle={
                    <>
                        อัพโหลดไฟล์ Excel ที่มีข้อมูล
                        <br />
                        นักเรียนและผลคะแนน PHQ-A
                    </>
                }
                icon={FileUp}
                imageSrc="/image/dashboard/import.png"
                imageAlt="Import Students"
                imageContainerClassName="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100px] sm:w-[150px] lg:w-[190px] pointer-events-none z-10 flex items-end"
                backUrl="/students"
                backLabel="กลับหน้านักเรียน"
            />

            <div className="max-w-6xl mx-auto relative z-10 px-4 py-8">
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
