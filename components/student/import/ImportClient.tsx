"use client";

import { useEffect, useRef, useState } from "react";
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

interface ImportClientProps {
    canViewNationalId: boolean;
}

export function ImportClient({ canViewNationalId }: ImportClientProps) {
    const router = useRouter();
    const [parsedData, setParsedData] = useState<ParsedStudent[] | null>(null);
    const redirectTimerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (redirectTimerRef.current) {
                window.clearTimeout(redirectTimerRef.current);
            }
        };
    }, []);

    const handleDataParsed = (data: ParsedStudent[]) => {
        setParsedData(data);
    };

    const handleCancel = () => {
        setParsedData(null);
    };

    const handleSuccess = (result: ImportResult) => {
        setParsedData(null);
        if (result.status === "partial") {
            const errorPreview = result.errors?.slice(0, 3).join("\n");
            const remainingErrorCount =
                result.errors && result.errors.length > 3
                    ? `\nและอีก ${result.errors.length - 3} รายการ`
                    : "";

            toast.warning(`นำเข้าสำเร็จ ${result.imported ?? 0} คน`, {
                description: errorPreview
                    ? `${result.message}\n\n${errorPreview}${remainingErrorCount}`
                    : result.message,
            });
        } else {
            toast.success("บันทึกข้อมูลสำเร็จ!", {
                description: result.message,
            });
        }
        if (redirectTimerRef.current) {
            window.clearTimeout(redirectTimerRef.current);
        }
        redirectTimerRef.current = window.setTimeout(() => {
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
                    canViewNationalId={canViewNationalId}
                />
            )}
        </div>
    );
}
