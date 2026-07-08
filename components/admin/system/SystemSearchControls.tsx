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
            className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5"
            onSubmit={(event) => {
                event.preventDefault();
                onSearch();
            }}
        >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
                <label className="min-w-0">
                    <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-800">
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

                <label className="min-w-0">
                    <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                        ประเภท
                    </span>
                    <select
                        value={entityType}
                        onChange={(event) =>
                            onEntityTypeChange(event.target.value as SystemEntityFilter)
                        }
                        className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-base hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    >
                        {ENTITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <Button
                    type="submit"
                    variant="primary"
                    disabled={isPending}
                    className="min-h-11 lg:self-end"
                >
                    <Search className="h-4 w-4" />
                    {isPending ? "กำลังค้นหา" : "ค้นหา"}
                </Button>
            </div>
            <p className="mt-3 text-xs leading-5 text-gray-600">
                พิมพ์อย่างน้อย 2 ตัวอักษร ระบบจะค้นหาเฉพาะเมื่อกดค้นหา
            </p>
        </form>
    );
}
