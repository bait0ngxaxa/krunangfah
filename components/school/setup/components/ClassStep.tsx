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
        <div className="relative overflow-hidden rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="relative z-10 mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--brand-primary)] bg-white shadow-md">
                    <LayoutGrid className="h-5 w-5 text-[var(--brand-primary)] stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                    <h2 className="break-words text-lg font-bold text-gray-800">
                        ห้องเรียน
                    </h2>
                    <p className="break-words text-sm text-gray-500">
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
                    className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-3 font-bold text-white shadow-sm transition-colors hover:bg-[var(--brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <span className="min-w-0 break-words">ถัดไป</span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                </button>
            </div>
            {classes.length === 0 && (
                <p className="mt-2 text-center text-xs leading-5 text-gray-500">
                    ข้ามได้ โดยเพิ่มห้องเรียนที่{" "}
                    <span className="text-emerald-500">
                        จัดการห้องเรียน
                    </span>{" "}
                    ในภายหลังได้เลย
                </p>
            )}
        </div>
    );
}
