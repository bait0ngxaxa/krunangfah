"use client";

import type { SchoolClassItem } from "@/types/school-setup.types";

interface SchoolClassSelectProps {
    classes: SchoolClassItem[];
    value: string;
    onChange: (value: string) => void;
    error?: string;
    placeholder?: string;
}

/**
 * Dropdown สำหรับเลือกห้องเรียน — ดึงจาก SchoolClass ของโรงเรียนนั้น
 * ใช้แทน ClassSelector (ที่มี hardcoded grades)
 */
export function SchoolClassSelect({
    classes,
    value,
    onChange,
    error,
    placeholder = "เลือกห้องเรียน",
}: SchoolClassSelectProps) {
    return (
        <div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none bg-white transition-all hover:border-emerald-300 text-slate-900"
            >
                <option value="">{placeholder}</option>
                {classes.length === 0 && (
                    <option value="" disabled>
                        ยังไม่มีห้องเรียน — ไปเพิ่มที่ จัดการห้องเรียน ก่อน
                    </option>
                )}
                {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                        {c.name}
                    </option>
                ))}
            </select>
            {error && (
                <p className="mt-1 text-sm text-red-500 font-medium">{error}</p>
            )}
        </div>
    );
}
