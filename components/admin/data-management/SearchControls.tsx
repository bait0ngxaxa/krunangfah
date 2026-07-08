import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
    MIN_DATA_MANAGEMENT_QUERY_LENGTH,
    type DataManagementDataState,
} from "@/lib/actions/data-management/search-intent";
import { SelectFilter } from "./SelectFilter";
import type { ManagedTargetType } from "./types";

interface SearchControlsProps {
    query: string;
    targetType: "all" | ManagedTargetType;
    dataState: DataManagementDataState;
    isPending: boolean;
    canSearch: boolean;
    onQueryChange: (value: string) => void;
    onTargetTypeChange: (value: "all" | ManagedTargetType) => void;
    onDataStateChange: (value: DataManagementDataState) => void;
    onSearch: () => void;
}

export function SearchControls({
    query,
    targetType,
    dataState,
    isPending,
    canSearch,
    onQueryChange,
    onTargetTypeChange,
    onDataStateChange,
    onSearch,
}: SearchControlsProps) {
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onSearch();
            }}
        >
            <div className="flex flex-col gap-3 md:flex-row">
                <label className="relative min-w-0 flex-1">
                    <span className="sr-only">ค้นหาข้อมูล</span>
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-emerald-600" />
                    <input
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder="ค้นหาโรงเรียน ชื่อนักเรียน รหัสนักเรียน หรือเลขบัตรประชาชน"
                        className="w-full rounded-xl border border-emerald-100 bg-emerald-50/50 py-3 pl-10 pr-4 text-sm font-medium text-gray-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                </label>
                <Button
                    type="submit"
                    disabled={isPending || !canSearch}
                    variant="primary"
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Search className="h-4 w-4" />
                    )}
                    ค้นหา
                </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                <SelectFilter
                    label="ประเภท"
                    value={targetType}
                    onChange={(value) =>
                        onTargetTypeChange(value as "all" | ManagedTargetType)
                    }
                    options={[
                        ["all", "ทั้งหมด"],
                        ["school", "โรงเรียน"],
                        ["student", "นักเรียน"],
                    ]}
                />
                <SelectFilter
                    label="สถานะ"
                    value={dataState}
                    onChange={(value) =>
                        onDataStateChange(value as DataManagementDataState)
                    }
                    options={[
                        ["all", "ทุกสถานะ"],
                        ["active", "ใช้งานอยู่"],
                        ["disabled", "ปิดใช้งาน"],
                        ["test", "ข้อมูลทดสอบ"],
                    ]}
                />
            </div>
            {!canSearch ? (
                <p className="mt-3 text-xs text-gray-600">
                    ค้นหาด้วยคำอย่างน้อย {MIN_DATA_MANAGEMENT_QUERY_LENGTH} ตัวอักษร หรือเลือกสถานะ “ปิดใช้งาน” / “ข้อมูลทดสอบ”
                </p>
            ) : null}
        </form>
    );
}
