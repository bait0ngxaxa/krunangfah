"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ExcelUploader } from "@/components/student/import/ExcelUploader";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import type { ImportResult } from "@/lib/actions/student/types";
import { toast } from "sonner";

const ImportPreview = dynamic(
    () =>
        import("@/components/student/import/ImportPreview/ImportPreview").then(
            (mod) => mod.ImportPreview,
        ),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
            </div>
        ),
    },
);

export function ImportClient() {
    const router = useRouter();
    const [parsedData, setParsedData] = useState<ParsedStudent[] | null>(null);

    const handleDataParsed = (data: ParsedStudent[]) => {
        setParsedData(data);
    };

    const handleCancel = () => {
        setParsedData(null);
    };

    const handleSuccess = (result: ImportResult) => {
        setParsedData(null);
        if (result.status === "partial") {
            toast.warning("นำเข้าข้อมูลสำเร็จบางส่วน", {
                description: result.message,
            });
        } else {
            toast.success("บันทึกข้อมูลสำเร็จ!", {
                description: result.message,
            });
        }
        setTimeout(() => {
            router.push("/dashboard");
        }, 2000);
    };

    return (
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
    );
}
