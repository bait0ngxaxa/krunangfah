"use client";

import { Filter } from "lucide-react";
import type { ReactElement } from "react";
import { FilterSelect } from "@/components/ui/FilterSelect";

interface ClassFilterProps {
    availableClasses: string[];
    currentClass?: string;
    onClassChange: (classValue: string) => void;
    disabled?: boolean;
}

export function ClassFilter({
    availableClasses,
    currentClass,
    onClassChange,
    disabled = false,
}: ClassFilterProps): ReactElement | null {
    if (availableClasses.length === 0) return null;

    return (
        <FilterSelect
            icon={Filter}
            label="เลือกห้องเรียน:"
            id="class-filter"
            value={currentClass ?? "all"}
            onChange={onClassChange}
            disabled={disabled}
        >
            <option value="all">แสดงทั้งหมด</option>
            {availableClasses.map((className) => (
                <option key={className} value={className}>
                    {className}
                </option>
            ))}
        </FilterSelect>
    );
}
