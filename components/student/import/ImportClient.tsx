"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ExcelUploader } from "@/components/student/import/ExcelUploader";
import { ImportResultDialog } from "@/components/student/import/ImportResultDialog";
import {
    buildImportedStudentsHref,
    type ImportCompletionContext,
} from "@/components/student/import/completion";
import { Skeleton } from "@/components/ui/Skeleton";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import type { ImportResult } from "@/lib/actions/student/types";

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
    const [completion, setCompletion] = useState<{
        result: ImportResult;
        context: ImportCompletionContext;
    } | null>(null);

    const handleDataParsed = (data: ParsedStudent[], errors: string[] = []) => {
        setParseErrors(errors);
        setParsedData(data);
    };

    const handleCancel = () => {
        setParseErrors([]);
        setParsedData(null);
    };

    const handleSuccess = (
        result: ImportResult,
        context: ImportCompletionContext,
    ) => {
        setParsedData(null);
        setParseErrors([]);
        setCompletion({ result, context });
    };

    const handleDismissCompletion = () => {
        setCompletion(null);
    };

    const handleImportMore = () => {
        setCompletion(null);
        setParsedData(null);
        setParseErrors([]);
    };

    const handleViewImportedStudents = () => {
        if (!completion) {
            return;
        }

        router.push(buildImportedStudentsHref(completion.context));
    };

    const handleGoHome = () => {
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
                result={completion?.result ?? null}
                context={completion?.context ?? null}
                onClose={handleDismissCompletion}
                onViewStudents={handleViewImportedStudents}
                onImportMore={handleImportMore}
                onGoHome={handleGoHome}
            />
        </div>
    );
}
