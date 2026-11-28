"use client";

import { CalendarRange } from "lucide-react";
import type { ReactElement } from "react";
import { FilterSelect } from "@/components/ui/FilterSelect";

interface SemesterFilterProps {
    availableSemesters: number[];
    selectedSemester: string;
    onSemesterChange: (semesterValue: string) => void;
    disabled?: boolean;
    allowAllSemesters?: boolean;
}

export function SemesterFilter({
    availableSemesters,
    selectedSemester,
    onSemesterChange,
    disabled = false,
    allowAllSemesters = true,
}: SemesterFilterProps): ReactElement {
    return (
        <FilterSelect
            icon={CalendarRange}
            label="เทอม:"
            id="semester-filter-analytics"
            value={selectedSemester}
            onChange={onSemesterChange}
            disabled={disabled}
            variant="field"
        >
            {allowAllSemesters ? <option value="all">ทุกเทอม</option> : null}
            {availableSemesters.map((semester) => (
                <option key={semester} value={String(semester)}>
                    เทอม {semester}
                </option>
            ))}
        </FilterSelect>
    );
}
