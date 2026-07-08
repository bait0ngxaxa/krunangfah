"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SystemEntityFilter } from "./types";

interface SystemSearchControlsProps {
    query: string;
    entityType: SystemEntityFilter;
    isPending: boolean;
    onQueryChange: (query: string) => void;
    onEntityTypeChange: (entityType: SystemEntityFilter) => void;
    onSearch: () => void;
}

const ENTITY_OPTIONS: Array<{ value: SystemEntityFilter; label: string }> = [
    { value: "all", label: "ทั้งหมด" },
    { value: "school", label: "โรงเรียน" },
    { value: "staff", label: "บุคลากร" },
    { value: "student", label: "นักเรียน" },
];

export function SystemSearchControls({
    query,
    entityType,
    isPending,
    onQueryChange,
    onEntityTypeChange,
    onSearch,
}: SystemSearchControlsProps) {
    return (
        <form
            className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
            onSubmit={(event) => {
                event.preventDefault();
                onSearch();
            }}
        >
            <div className="flex flex-col gap-3">
                <label className="min-w-0 flex-1">
                    <span className="mb-1.5 flex items-center gap-2 text-sm font-bold text-gray-800">
                        <Search className="h-4 w-4 text-emerald-600" />
                        ค้นหาข้อมูล
                    </span>
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder="ชื่อโรงเรียน ชื่อบุคลากร อีเมล ชื่อนักเรียน รหัสนักเรียน..."
                        className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-base placeholder:text-gray-500 hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                </label>

                <label>
                    <span className="mb-1.5 flex items-center gap-2 text-sm font-bold text-gray-800">
                        <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                        ประเภท
                    </span>
                    <select
                        value={entityType}
                        onChange={(event) =>
                            onEntityTypeChange(event.target.value as SystemEntityFilter)
                        }
                        className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none transition-base hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    >
                        {ENTITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-gray-600">
                    พิมพ์อย่างน้อย 2 ตัวอักษร ระบบจะค้นหาเฉพาะเมื่อกดค้นหา
                </p>
                <Button type="submit" variant="primary" disabled={isPending}>
                    <Search className="h-4 w-4" />
                    {isPending ? "กำลังค้นหา" : "ค้นหา"}
                </Button>
            </div>
        </form>
    );
}
