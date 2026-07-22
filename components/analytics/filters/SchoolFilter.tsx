"use client";

import { School } from "lucide-react";
import type { ReactElement } from "react";
import { FilterSelect } from "@/components/ui/FilterSelect";

interface SchoolOption {
    id: string;
    name: string;
}

interface SchoolFilterProps {
    schools: SchoolOption[];
    selectedSchoolId: string;
    onSchoolChange: (schoolId: string) => void;
    requireExplicitSelection?: boolean;
    disabled?: boolean;
}

export function SchoolFilter({
    schools,
    selectedSchoolId,
    onSchoolChange,
    requireExplicitSelection = false,
    disabled = false,
}: SchoolFilterProps): ReactElement {
    return (
        <FilterSelect
            icon={School}
            label="เลือกโรงเรียน:"
            id="school-filter"
            value={selectedSchoolId}
            onChange={onSchoolChange}
            disabled={disabled}
        >
            {requireExplicitSelection ? (
                <option value="">กรุณาเลือกโรงเรียน</option>
            ) : (
                <option value="all">ทุกโรงเรียน</option>
            )}
            {schools.map((school) => (
                <option key={school.id} value={school.id}>
                    {school.name}
                </option>
            ))}
        </FilterSelect>
    );
}
