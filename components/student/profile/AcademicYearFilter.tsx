"use client";

import { useOptimistic, useState, useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactElement } from "react";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { getCurrentAcademicYear } from "@/lib/utils/academic-year";

interface AcademicYear {
    id: string;
    year: number;
    semester: number;
}
interface AcademicYearFilterProps {
    academicYears: AcademicYear[];
    currentYearId?: string;
}
const MAX_RECENT_YEARS = 3;

export function AcademicYearFilter({
    academicYears,
    currentYearId,
}: AcademicYearFilterProps): ReactElement | null {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [showAllYears, setShowAllYears] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [optimisticYearId, setOptimisticYearId] = useOptimistic(
        currentYearId ?? "all",
        (_: string, value: string) => value,
    );
    if (academicYears.length === 0) return null;
    const currentAcademicYear = getCurrentAcademicYear();
    const uniqueYears = [
        ...new Set(academicYears.map((year) => year.year)),
    ].sort((a, b) => b - a);
    const selectedYear =
        optimisticYearId === "all"
            ? undefined
            : academicYears.find(
                  ({ id, year }) =>
                      optimisticYearId === id || optimisticYearId === `year:${year}`,
              )?.year;
    // Keep the selected year visible so the filter reflects the data being shown.
    const displayedYears = showAllYears
        ? uniqueYears
        : uniqueYears.filter(
              (year, index) => index < MAX_RECENT_YEARS || year === selectedYear,
          );
    const hiddenYearCount = uniqueYears.length - displayedYears.length;
    const displayedAcademicYears = academicYears.filter((year) =>
        displayedYears.includes(year.year),
    );
    function handleChange(value: string): void {
        if (value === "__show_all__") {
            setShowAllYears(true);
            return;
        }
        const params = new URLSearchParams(searchParams.toString());
        if (value === "all") params.delete("year");
        else params.set("year", value);
        params.delete("round");
        params.delete("phqPage");
        const queryString = params.toString();
        startTransition(() => {
            setOptimisticYearId(value);
            router.push(queryString ? `${pathname}?${queryString}` : pathname, {
                scroll: false,
            });
        });
    }
    return (
        <FilterSelect
            icon={CalendarDays}
            label="ปีการศึกษา:"
            id="year-filter-profile"
            value={optimisticYearId}
            onChange={handleChange}
            disabled={isPending}
        >
            <option value="all">ทุกปีการศึกษา</option>
            {uniqueYears.length > 1 &&
                displayedYears.map((year) => (
                    <option key={`year:${year}`} value={`year:${year}`}>
                        ปี {year} (ทุกเทอม)
                        {year === currentAcademicYear.year ? " (ปัจจุบัน)" : ""}
                    </option>
                ))}
            <optgroup label="แยกรายเทอม">
                {displayedAcademicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                        {year.year} เทอม {year.semester}
                        {year.year === currentAcademicYear.year &&
                        year.semester === currentAcademicYear.semester
                            ? " (ปัจจุบัน)"
                            : ""}
                    </option>
                ))}
            </optgroup>
            {hiddenYearCount > 0 && !showAllYears ? (
                <option value="__show_all__">
                    ดูปีก่อนหน้านี้ ({hiddenYearCount} ปี)
                </option>
            ) : null}
        </FilterSelect>
    );
}
