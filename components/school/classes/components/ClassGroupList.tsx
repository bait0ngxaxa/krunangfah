"use client";

import { X, LayoutGrid } from "lucide-react";
import type { ClassGroupListProps } from "../types";
import type { SchoolClassItem } from "../types";

export function ClassGroupList({
    classes,
    readOnly,
    onRemove,
}: ClassGroupListProps) {
    // Group classes by prefix (before "/")
    const groups = Array.from(
        classes.reduce<Map<string, SchoolClassItem[]>>((acc, c) => {
            const slashIdx = c.name.indexOf("/");
            const prefix =
                slashIdx > 0 ? c.name.slice(0, slashIdx) : c.name;
            const group = acc.get(prefix) ?? [];
            group.push(c);
            acc.set(prefix, group);
            return acc;
        }, new Map()),
    ).sort(([a], [b]) => a.localeCompare(b, "th"));

    return (
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
                    {groups.map(([grade, items]) => (
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
                                                    onRemove(c.id, c.name)
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
