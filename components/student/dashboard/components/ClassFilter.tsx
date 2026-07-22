import { Filter } from "lucide-react";
import type { ReactElement } from "react";

import { FilterSelect } from "@/components/ui/FilterSelect";
import type { ClassOption } from "../types";

interface ClassFilterProps {
    classOptions: ClassOption[];
    classes: string[];
    selectedClass: string;
    totalStudents: number;
    onClassChange: (className: string) => void;
}

export function ClassFilter({
    classOptions,
    classes,
    selectedClass,
    totalStudents,
    onClassChange,
}: ClassFilterProps): ReactElement | null {
    if (classes.length <= 1) return null;

    return (
        <FilterSelect
            icon={Filter}
            label="เลือกห้องเรียน:"
            id="student-class-filter"
            value={selectedClass}
            onChange={onClassChange}
        >
            <option value="all">{`ทุกห้อง (${totalStudents} คน)`}</option>
            {classOptions.map((classOption) => (
                <option key={classOption.name} value={classOption.name}>
                    {`${classOption.name} (${classOption.count} คน)`}
                </option>
            ))}
        </FilterSelect>
    );
}
