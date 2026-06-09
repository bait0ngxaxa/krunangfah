"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ExcelUploader } from "@/components/student/import/ExcelUploader";
import { ImportResultDialog } from "@/components/student/import/ImportResultDialog";
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
            <div
                className="flex flex-col items-center justify-center gap-3 py-16"
                role="status"
            >
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-100 border-b-emerald-500" />
                <p className="text-sm font-medium text-gray-600">
                    กำลังเตรียมพรีวิวข้อมูล…
                </p>
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
    const [parseErrors, setParseErrors] = useState<string[]>([]);
    const [partialResult, setPartialResult] = useState<ImportResult | null>(null);
    const redirectTimerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (redirectTimerRef.current) {
                window.clearTimeout(redirectTimerRef.current);
            }
        };
    }, []);

    const handleDataParsed = (data: ParsedStudent[], errors: string[] = []) => {
        setParseErrors(errors);
        setParsedData(data);
    };

    const handleCancel = () => {
        setParseErrors([]);
        setParsedData(null);
    };

    const scheduleRedirect = () => {
        if (redirectTimerRef.current) {
            window.clearTimeout(redirectTimerRef.current);
        }
        redirectTimerRef.current = window.setTimeout(() => {
            router.push("/dashboard");
        }, 2000);
    };

    const handleSuccess = (result: ImportResult) => {
        setParsedData(null);
        if (result.status === "partial") {
            setParseErrors([]);
            setPartialResult(result);
            return;
        }

        setParseErrors([]);
        toast.success("บันทึกข้อมูลสำเร็จ!", {
            description: result.message,
        });
        scheduleRedirect();
    };

    const handleClosePartialResult = () => {
        setPartialResult(null);
        router.push("/dashboard");
    };

    return (
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 md:p-8">
            {!parsedData ? (
                <ExcelUploader onDataParsed={handleDataParsed} />
            ) : (
                <ImportPreview
                    data={parsedData}
                    parseErrors={parseErrors}
                    onCancel={handleCancel}
                    onSuccess={handleSuccess}
                    canViewNationalId={canViewNationalId}
                />
            )}
            <ImportResultDialog
                result={partialResult}
                onClose={handleClosePartialResult}
            />
        </div>
    );
}
