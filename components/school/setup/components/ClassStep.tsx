"use client";

import { LayoutGrid, ArrowRight, AlertTriangle } from "lucide-react";
import { ClassListEditor } from "@/components/school/classes";
import type { ClassStepProps } from "../types";

export function ClassStep({
    classes,
    currentAcademicYear,
    onUpdate,
    onNext,
}: ClassStepProps) {
    return (
        <div className="relative bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6 sm:p-8 overflow-hidden">
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white border-2 border-[var(--brand-primary)] flex items-center justify-center shadow-md">
                    <LayoutGrid className="w-5 h-5 text-[var(--brand-primary)] stroke-[2.5]" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-800">
                        ห้องเรียน
                    </h2>
                    <p className="text-sm text-gray-500">
                        เพิ่มห้องเรียนของโรงเรียน
                        (สามารถแก้ไขได้ภายหลัง)
                    </p>
                </div>
            </div>

            {currentAcademicYear ? (
                <ClassListEditor
                    initialClasses={classes}
                    academicYears={[currentAcademicYear]}
                    lockAcademicYearSelection
                    onUpdate={onUpdate}
                />
            ) : (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-700">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                        <div>
                            <p className="text-sm font-bold">
                                ไม่พบปีการศึกษาปัจจุบัน
                            </p>
                            <p className="mt-1 text-sm">
                                กรุณาติดต่อผู้ดูแลระบบก่อนเพิ่มห้องเรียน
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-6 flex gap-3">
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!currentAcademicYear}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                    ถัดไป
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
            {classes.length === 0 && (
                <p className="text-center text-xs text-gray-400 mt-2">
                    ข้ามได้ — เพิ่มห้องเรียนที่{" "}
                    <span className="text-emerald-500">
                        จัดการห้องเรียน
                    </span>{" "}
                    ในภายหลังได้เลย
                </p>
            )}
        </div>
    );
}
