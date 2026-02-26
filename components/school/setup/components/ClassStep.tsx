"use client";

import { LayoutGrid, ArrowRight } from "lucide-react";
import { ClassListEditor } from "@/components/school/classes";
import type { ClassStepProps } from "../types";

export function ClassStep({ classes, onUpdate, onNext }: ClassStepProps) {
    return (
        <div className="relative bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6 sm:p-8 overflow-hidden">
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-[#0BD0D9] flex items-center justify-center shadow-md">
                    <LayoutGrid className="w-5 h-5 text-white stroke-[2.5]" />
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

            <ClassListEditor
                initialClasses={classes}
                onUpdate={onUpdate}
            />

            <div className="mt-6 flex gap-3">
                <button
                    type="button"
                    onClick={onNext}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0BD0D9] hover:bg-[#09B8C0] text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
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
