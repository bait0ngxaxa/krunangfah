"use client";

import { Users, ArrowLeft, ArrowRight } from "lucide-react";
import { TeacherRosterEditor } from "@/components/school/roster";
import type { RosterStepProps } from "../types";

export function RosterStep({
    roster,
    classes,
    onUpdate,
    onBack,
    onNext,
}: RosterStepProps) {
    return (
        <div className="relative bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6 sm:p-8 overflow-hidden">
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-[#0BD0D9] flex items-center justify-center shadow-md">
                    <Users className="w-5 h-5 text-white stroke-[2.5]" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-800">
                        รายชื่อครู
                    </h2>
                    <p className="text-sm text-gray-500">
                        ลงข้อมูลครูทั้งหมดในโรงเรียน (เพื่อใช้ตอน invite
                        ภายหลัง)
                    </p>
                </div>
            </div>

            <TeacherRosterEditor
                initialRoster={roster}
                schoolClasses={classes}
                onUpdate={onUpdate}
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
                    onClick={onNext}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0BD0D9] hover:bg-[#09B8C0] text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
                >
                    ถัดไป
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
            {roster.length === 0 && (
                <p className="text-center text-xs text-gray-400 mt-2">
                    ข้ามได้ — เพิ่มรายชื่อครูที่หลังจากตั้งค่าเสร็จ
                </p>
            )}
        </div>
    );
}
