"use client";

import { useState, useTransition } from "react";
import { Plus, X, Zap } from "lucide-react";
import {
    addSchoolClass,
    removeSchoolClass,
} from "@/lib/actions/school-setup.actions";
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
            return;
        }
        if (result.data) {
            const updated = [...classes, result.data].sort((a, b) =>
                a.name.localeCompare(b.name, "th"),
            );
            syncUpdate(updated);
        }
        setInputValue("");
    }

    async function handleRemove(id: string) {
        setErrorMsg(null);
        const result = await removeSchoolClass(id);
        if (!result.success) {
            setErrorMsg(result.message);
            return;
        }
        startTransition(() => {
            syncUpdate(classes.filter((c) => c.id !== id));
        });
    }

    async function handleBulkAdd() {
        const grade = bulkGrade.trim();
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
        }

        setBulkGrade("");
        setBulkCount("");
    }

    return (
        <div className="space-y-4">
            {/* Single add */}
            {!readOnly && (
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
                        className="flex-1 px-4 py-2.5 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100/50 focus:border-emerald-300 outline-none bg-white text-sm text-black placeholder:text-gray-400 transition-all"
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-linear-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่ม
                    </button>
                </div>
            )}

            {/* Bulk add */}
            {!readOnly && (
                <div className="flex flex-col sm:flex-row gap-2 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-semibold shrink-0">
                        <Zap className="w-4 h-4" />
                        เพิ่มแบบหลายห้องเรียน:
                    </div>
                    <div className="flex flex-1 gap-2 flex-wrap">
                        <input
                            type="text"
                            value={bulkGrade}
                            onChange={(e) => setBulkGrade(e.target.value)}
                            placeholder="ระดับชั้น เช่น ม.1"
                            className="flex-1 min-w-[100px] px-3 py-2 border border-emerald-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-100 bg-white text-black placeholder:text-gray-400"
                        />
                        <input
                            type="number"
                            value={bulkCount}
                            onChange={(e) => setBulkCount(e.target.value)}
                            min={1}
                            max={20}
                            placeholder="จำนวนทับ"
                            className="w-28 px-3 py-2 border border-emerald-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-100 bg-white text-black placeholder:text-gray-400"
                        />
                        <button
                            type="button"
                            onClick={handleBulkAdd}
                            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                        >
                            Generate
                        </button>
                    </div>
                    {bulkGrade && bulkCount && !isNaN(parseInt(bulkCount)) && (
                        <p className="w-full text-xs text-gray-500 mt-0.5 pl-1">
                            จะสร้าง:{" "}
                            {Array.from(
                                { length: Math.min(parseInt(bulkCount), 20) },
                                (_, i) => `${bulkGrade}/${i + 1}`,
                            ).join(", ")}
                        </p>
                    )}
                </div>
            )}

            {errorMsg && (
                <p className="text-sm text-red-500 font-medium">{errorMsg}</p>
            )}

            {/* Class tags — grouped by grade level */}
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
                                <p className="text-xs font-semibold text-emerald-600 mb-1">
                                    {grade}{" "}
                                    <span className="text-gray-400 font-normal">
                                        ({items.length} ห้อง)
                                    </span>
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {items.map((c) => (
                                        <span
                                            key={c.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-teal-700 rounded-full text-sm font-medium"
                                        >
                                            {c.name}
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRemove(c.id)
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
    );
}
