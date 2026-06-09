"use client";

import { ClipboardCheck, ArrowLeft, Check } from "lucide-react";
import { SetupSummary } from "@/components/school/SetupSummary";
import type { SummaryStepProps } from "../types";

export function SummaryStep({
    schoolName,
    province,
    classes,
    roster,
    canFinish,
    onBack,
    onFinish,
}: SummaryStepProps) {
    return (
        <div className="relative overflow-hidden rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="relative z-10 mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#34D399] shadow-md">
                    <ClipboardCheck className="h-5 w-5 text-white stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                    <h2 className="break-words text-lg font-bold text-gray-800">
                        สรุปข้อมูล
                    </h2>
                    <p className="break-words text-sm text-gray-500">
                        ตรวจสอบข้อมูลทั้งหมดก่อนเสร็จสิ้น
                    </p>
                </div>
            </div>

            {!canFinish && (
                <p
                    role="alert"
                    className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
                >
                    ยังไม่มีข้อมูลโรงเรียน กรุณาย้อนกลับไปกรอกข้อมูลให้ครบก่อนเสร็จสิ้น
                </p>
            )}

            <SetupSummary
                schoolName={schoolName}
                province={province}
                classes={classes}
                roster={roster}
            />

            <div className="mt-6 flex gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-3 font-bold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">ย้อนกลับ</span>
                </button>
                <button
                    type="button"
                    onClick={onFinish}
                    disabled={!canFinish}
                    className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#34D399] px-4 py-3 font-bold text-white shadow-sm transition-colors hover:bg-[#10B981] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Check className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">
                        เสร็จสิ้นและเข้าสู่ระบบ
                    </span>
                </button>
            </div>
        </div>
    );
}
