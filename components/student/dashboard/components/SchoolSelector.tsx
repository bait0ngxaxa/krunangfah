import { School } from "lucide-react";
import type { ReactElement } from "react";
import { FilterSelect } from "@/components/ui/FilterSelect";
import type { SchoolOption } from "../types";

interface SchoolSelectorProps {
    schools: SchoolOption[];
    selectedSchoolId: string;
    onSchoolChange: (schoolId: string) => void;
}

export function SchoolSelector({
    schools,
    selectedSchoolId,
    onSchoolChange,
}: SchoolSelectorProps): ReactElement {
    const hasSchools = schools.length > 0;

    return (
        <FilterSelect
            icon={School}
            label="เลือกโรงเรียน:"
            id="student-school-filter"
            value={selectedSchoolId}
            onChange={onSchoolChange}
            disabled={!hasSchools}
        >
            <option value="">
                {hasSchools ? "กรุณาเลือกโรงเรียน" : "ยังไม่มีโรงเรียนในระบบ"}
            </option>
            {schools.map((school) => (
                <option key={school.id} value={school.id}>
                    {school.name}
                </option>
            ))}
        </FilterSelect>
    );
}
