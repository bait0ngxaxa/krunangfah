"use client";

import { Zap } from "lucide-react";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import type { BulkClassAdderProps } from "../types";

export function BulkClassAdder({
    bulkGrade,
    bulkCount,
    onGradeChange,
    onCountChange,
    onBulkAdd,
}: BulkClassAdderProps) {
    return (
        <div className="p-4 bg-cyan-50/40 rounded-2xl border-2 border-cyan-100">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-gray-700">
                        เพิ่มแบบทีเดียวหลายห้อง
                    </h3>
                    <p className="text-[11px] text-gray-400">
                        ใส่ระดับชั้น + จำนวนทับ
                        แล้วระบบสร้างห้องเรียนให้เลย
                    </p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={bulkGrade}
                    onChange={(e) => onGradeChange(e.target.value)}
                    placeholder="ระดับชั้น เช่น ม.1"
                    className="flex-1 min-w-[100px] px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                />
                <input
                    type="number"
                    value={bulkCount}
                    onChange={(e) => onCountChange(e.target.value)}
                    min={1}
                    max={20}
                    placeholder="จำนวนทับ"
                    className="w-28 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                />
                <button
                    type="button"
                    onClick={onBulkAdd}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-sm"
                >
                    สร้างห้อง
                </button>
            </div>
            {bulkGrade && bulkCount && !isNaN(parseInt(bulkCount)) && (
                <p className="text-xs text-gray-500 mt-2 pl-1">
                    จะสร้าง:{" "}
                    {Array.from(
                        { length: Math.min(parseInt(bulkCount), 20) },
                        (_, i) =>
                            `${normalizeClassName(bulkGrade)}/${i + 1}`,
                    ).join(", ")}
                </p>
            )}
        </div>
    );
}
