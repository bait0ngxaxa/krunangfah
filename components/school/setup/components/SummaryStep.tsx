"use client";

import { ClipboardCheck, ArrowLeft, Check } from "lucide-react";
import { SetupSummary } from "@/components/school/SetupSummary";
import type { SummaryStepProps } from "../types";

export function SummaryStep({
    schoolName,
    province,
    classes,
    roster,
    onBack,
    onFinish,
}: SummaryStepProps) {
    return (
        <div className="relative bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6 sm:p-8 overflow-hidden">
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-[#34D399] flex items-center justify-center shadow-md">
                    <ClipboardCheck className="w-5 h-5 text-white stroke-[2.5]" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-800">
                        สรุปข้อมูล
                    </h2>
                    <p className="text-sm text-gray-500">
                        ตรวจสอบข้อมูลทั้งหมดก่อนเสร็จสิ้น
                    </p>
                </div>
            </div>

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
                    className="flex items-center justify-center gap-2 px-5 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-bold transition-colors hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    ย้อนกลับ
                </button>
                <button
                    type="button"
                    onClick={onFinish}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#34D399] hover:bg-[#10B981] text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
                >
                    <Check className="w-4 h-4" />
                    เสร็จสิ้น — เข้าสู่ระบบ
                </button>
            </div>
        </div>
    );
}
