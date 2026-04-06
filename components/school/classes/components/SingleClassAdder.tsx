"use client";

import { Plus } from "lucide-react";
import type { SingleClassAdderProps } from "../types";

export function SingleClassAdder({
    inputValue,
    onInputChange,
    onAdd,
}: SingleClassAdderProps) {
    return (
        <div className="p-4 bg-white rounded-2xl border-2 border-gray-100">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-white border border-[var(--brand-primary)] flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                </div>
                <h3 className="text-sm font-bold text-gray-700">
                    เพิ่มแบบกำหนดเอง
                </h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), onAdd())
                    }
                    placeholder="เช่น ม.1/1, ป.6/2, ห้องพิเศษ..."
                    className="w-full sm:flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[var(--brand-primary)] outline-none bg-white text-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                />
                <button
                    type="button"
                    onClick={onAdd}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    เพิ่ม
                </button>
            </div>
        </div>
    );
}
