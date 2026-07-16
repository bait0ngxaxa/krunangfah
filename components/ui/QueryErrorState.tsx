"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./Button";

interface QueryErrorStateProps {
    requestId: string;
    title?: string;
}

export function QueryErrorState({
    requestId,
    title = "โหลดข้อมูลไม่สำเร็จ",
}: QueryErrorStateProps) {
    const router = useRouter();

    return (
        <section
            className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6"
            role="alert"
        >
            <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div className="min-w-0 space-y-3">
                    <div>
                        <h2 className="font-bold text-red-900">{title}</h2>
                        <p className="mt-1 text-sm text-red-800">
                            ข้อมูลอาจยังอยู่ครบ กรุณาลองโหลดอีกครั้งก่อนดำเนินการต่อ
                        </p>
                        <p className="mt-2 break-all text-xs text-red-700">
                            รหัสอ้างอิง: {requestId}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => router.refresh()}
                    >
                        <RefreshCw className="h-4 w-4" />
                        โหลดข้อมูลอีกครั้ง
                    </Button>
                </div>
            </div>
        </section>
    );
}
