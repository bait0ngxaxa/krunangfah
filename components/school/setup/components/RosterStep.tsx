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
        <div className="relative overflow-hidden rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="relative z-10 mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--brand-primary)] bg-white shadow-md">
                    <Users className="h-5 w-5 text-[var(--brand-primary)] stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                    <h2 className="break-words text-lg font-bold text-gray-800">
                        รายชื่อครู
                    </h2>
                    <p className="break-words text-sm text-gray-500">
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
                    className="flex min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-3 font-bold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">ย้อนกลับ</span>
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-3 font-bold text-white shadow-sm transition-colors hover:bg-[var(--brand-primary-hover)]"
                >
                    <span className="min-w-0 break-words">ถัดไป</span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                </button>
            </div>
            {roster.length === 0 && (
                <p className="mt-2 text-center text-xs leading-5 text-gray-500">
                    ข้ามได้ แล้วเพิ่มรายชื่อครูหลังจากตั้งค่าเสร็จ
                </p>
            )}
        </div>
    );
}
