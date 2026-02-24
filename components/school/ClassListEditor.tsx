"use client";

import { useState, useTransition } from "react";
import { Plus, X, Zap, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import {
    addSchoolClass,
    removeSchoolClass,
} from "@/lib/actions/school-setup.actions";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import type { SchoolClassItem } from "@/types/school-setup.types";

interface ClassListEditorProps {
    initialClasses: SchoolClassItem[];
    onUpdate?: (classes: SchoolClassItem[]) => void;
    readOnly?: boolean;
}

export function ClassListEditor({
    initialClasses,
    onUpdate,
    readOnly = false,
}: ClassListEditorProps) {
    const [classes, setClasses] = useState<SchoolClassItem[]>(initialClasses);
    const [inputValue, setInputValue] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    // Bulk add state
    const [bulkGrade, setBulkGrade] = useState("");
    const [bulkCount, setBulkCount] = useState("");

    function syncUpdate(updated: SchoolClassItem[]) {
        setClasses(updated);
        onUpdate?.(updated);
    }

    async function handleAdd() {
        const name = inputValue.trim();
        if (!name) return;
        setErrorMsg(null);

        const result = await addSchoolClass(name);
        if (!result.success) {
            setErrorMsg(result.message);
            toast.error(result.message || "เพิ่มห้องเรียนไม่สำเร็จ");
            return;
        }
        if (result.data) {
            const updated = [...classes, result.data].sort((a, b) =>
                a.name.localeCompare(b.name, "th"),
            );
            syncUpdate(updated);
            toast.success(`เพิ่มห้อง "${result.data.name}" สำเร็จ`);
        }
        setInputValue("");
    }

    async function handleRemove(id: string, name: string) {
        const confirmed = window.confirm(`ต้องการลบห้อง "${name}" ใช่หรือไม่?`);
        if (!confirmed) return;

        setErrorMsg(null);
        const result = await removeSchoolClass(id);
        if (!result.success) {
            setErrorMsg(result.message);
            toast.error(result.message || "ลบห้องเรียนไม่สำเร็จ");
            return;
        }
        startTransition(() => {
            syncUpdate(classes.filter((c) => c.id !== id));
        });
        toast.success(`ลบห้อง "${name}" สำเร็จ`);
    }

    async function handleBulkAdd() {
        const grade = normalizeClassName(bulkGrade.trim());
        const count = parseInt(bulkCount, 10);
        if (!grade || isNaN(count) || count < 1 || count > 20) {
            setErrorMsg("กรุณากรอกระดับชั้นและจำนวนทับที่ถูกต้อง (1-20)");
            return;
        }
        setErrorMsg(null);

        const names = Array.from(
            { length: count },
            (_, i) => `${grade}/${i + 1}`,
        );
        const existingNames = new Set(classes.map((c) => c.name));
        const toAdd = names.filter((n) => !existingNames.has(n));

        if (toAdd.length === 0) {
            setErrorMsg("ห้องเรียนทั้งหมดในชุดนี้มีอยู่แล้ว");
            return;
        }

        const results = await Promise.all(toAdd.map((n) => addSchoolClass(n)));
        const added = results
            .filter((r) => r.success && r.data)
            .map((r) => r.data as SchoolClassItem);

        if (added.length > 0) {
            const updated = [...classes, ...added].sort((a, b) =>
                a.name.localeCompare(b.name, "th"),
            );
            syncUpdate(updated);
            toast.success(`สร้างห้องเรียนสำเร็จ ${added.length} ห้อง`);
        } else {
            toast.error("ไม่สามารถสร้างห้องเรียนได้");
        }

        setBulkGrade("");
        setBulkCount("");
    }

    return (
        <div className="space-y-5">
            {/* ── Block 1: เพิ่มแบบกำหนดเอง ── */}
            {!readOnly && (
                <div className="p-4 bg-white rounded-2xl border-2 border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-[#0BD0D9] flex items-center justify-center">
                            <Plus className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-700">
                            เพิ่มแบบกำหนดเอง
                        </h3>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" &&
                                (e.preventDefault(), handleAdd())
                            }
                            placeholder="เช่น ม.1/1, ป.6/2, ห้องพิเศษ..."
                            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#0BD0D9] outline-none bg-white text-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                        />
                        <button
                            type="button"
                            onClick={handleAdd}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0BD0D9] hover:bg-[#09B8C0] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            เพิ่ม
                        </button>
                    </div>
                </div>
            )}

            {/* ── Block 2: เพิ่มแบบทีเดียวหลายห้อง ── */}
            {!readOnly && (
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
                            onChange={(e) => setBulkGrade(e.target.value)}
                            placeholder="ระดับชั้น เช่น ม.1"
                            className="flex-1 min-w-[100px] px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                        />
                        <input
                            type="number"
                            value={bulkCount}
                            onChange={(e) => setBulkCount(e.target.value)}
                            min={1}
                            max={20}
                            placeholder="จำนวนทับ"
                            className="w-28 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                        />
                        <button
                            type="button"
                            onClick={handleBulkAdd}
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
            )}

            {/* Error message */}
            {errorMsg && (
                <p className="text-sm text-red-500 font-medium">{errorMsg}</p>
            )}

            {/* ── Block 3: ห้องเรียนที่มีอยู่แล้ว ── */}
            <div className="p-4 bg-gray-50/50 rounded-2xl border-2 border-gray-100">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gray-400 flex items-center justify-center">
                            <LayoutGrid className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-700">
                            ห้องเรียนที่มีอยู่แล้ว
                        </h3>
                    </div>
                    <span className="text-xs text-gray-400 font-medium bg-white px-2.5 py-1 rounded-full border border-gray-100">
                        {classes.length} ห้อง
                    </span>
                </div>

                {classes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">
                        ยังไม่มีห้องเรียน — เพิ่มด้านบนได้เลย
                    </p>
                ) : (
                    <div className="space-y-3">
                        {Array.from(
                            classes.reduce<Map<string, SchoolClassItem[]>>(
                                (acc, c) => {
                                    const slashIdx = c.name.indexOf("/");
                                    const prefix =
                                        slashIdx > 0
                                            ? c.name.slice(0, slashIdx)
                                            : c.name;
                                    const group = acc.get(prefix) ?? [];
                                    group.push(c);
                                    acc.set(prefix, group);
                                    return acc;
                                },
                                new Map(),
                            ),
                        )
                            .sort(([a], [b]) => a.localeCompare(b, "th"))
                            .map(([grade, items]) => (
                                <div key={grade}>
                                    <p className="text-xs font-semibold text-[#09B8C0] mb-1">
                                        {grade}{" "}
                                        <span className="text-gray-400 font-normal">
                                            ({items.length} ห้อง)
                                        </span>
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {items.map((c) => (
                                            <span
                                                key={c.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-gray-100 text-gray-700 rounded-full text-sm font-bold"
                                            >
                                                {c.name}
                                                {!readOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleRemove(
                                                                c.id,
                                                                c.name,
                                                            )
                                                        }
                                                        className="hover:text-red-500 transition-colors cursor-pointer"
                                                        title="ลบห้อง"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
