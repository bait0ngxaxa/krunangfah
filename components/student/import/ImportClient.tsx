"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ExcelUploader } from "@/components/student/import/ExcelUploader";
import { ImportResultDialog } from "@/components/student/import/ImportResultDialog";
import { Skeleton } from "@/components/ui/Skeleton";
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
                className="space-y-3 py-8"
                role="status"
                aria-label="กำลังเตรียมพรีวิวข้อมูล"
            >
                <Skeleton className="h-5 w-44 rounded" />
                {[1, 2, 3, 4].map((row) => (
                    <Skeleton key={row} className="h-12 w-full rounded-xl" />
                ))}
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
