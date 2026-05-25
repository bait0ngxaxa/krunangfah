"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { RotateCcw } from "lucide-react";

import { AcademicYearFilter } from "./filters/AcademicYearFilter";
import { ClassFilter } from "./filters/ClassFilter";
import { SemesterFilter } from "./filters/SemesterFilter";
import { SchoolFilter } from "./filters/SchoolFilter";
import { Button } from "@/components/ui/Button";

interface SchoolOption {
    id: string;
    name: string;
}

interface AnalyticsFiltersProps {
    schools?: SchoolOption[];
    availableClasses: string[];
    availableYears: number[];
    availableSemesters: number[];
    selectedSchoolId: string;
    selectedClass: string;
    selectedAcademicYear: string;
    selectedSemester: string;
    isSystemAdmin: boolean;
    showClassFilter: boolean;
    requireSchoolSelection?: boolean;
}

type FilterKey = "school" | "class" | "year" | "semester";
type FilterUpdates = Partial<Record<FilterKey, string | null>>;

interface FilterState {
    school: string;
    class: string;
    year: string;
    semester: string;
}

function buildFilterState(input: {
    selectedSchoolId: string;
    selectedClass: string;
    selectedAcademicYear: string;
    selectedSemester: string;
}): FilterState {
    return {
        school: input.selectedSchoolId,
        class: input.selectedClass,
        year: input.selectedAcademicYear,
        semester: input.selectedSemester,
    };
}

function getClearedFilterValue(key: FilterKey, isSystemAdmin: boolean): string {
    if (key === "school" && isSystemAdmin) {
        return "";
    }
    return "all";
}

function applyFilterUpdates(
    current: FilterState,
    updates: FilterUpdates,
    isSystemAdmin: boolean,
): FilterState {
    return {
        school:
            updates.school === undefined
                ? current.school
                : resolveFilterValue("school", updates.school, isSystemAdmin),
        class:
            updates.class === undefined
                ? current.class
                : resolveFilterValue("class", updates.class, isSystemAdmin),
        year:
            updates.year === undefined
                ? current.year
                : resolveFilterValue("year", updates.year, isSystemAdmin),
        semester:
            updates.semester === undefined
                ? current.semester
                : resolveFilterValue("semester", updates.semester, isSystemAdmin),
    };
}

function resolveFilterValue(
    key: FilterKey,
    value: string | null,
    isSystemAdmin: boolean,
): string {
    if (!value || value === "all") {
        return getClearedFilterValue(key, isSystemAdmin);
    }
    return value;
}

function setFilterParam(
    params: URLSearchParams,
    key: FilterKey,
    value: string,
): void {
    if (!value || value === "all") {
        params.delete(key);
        return;
    }
    params.set(key, value);
}

function setFilterParams(params: URLSearchParams, filters: FilterState): void {
    setFilterParam(params, "school", filters.school);
    setFilterParam(params, "class", filters.class);
    setFilterParam(params, "year", filters.year);
    setFilterParam(params, "semester", filters.semester);
}

export function AnalyticsFilters({
    schools,
    availableClasses,
    availableYears,
    availableSemesters,
    selectedSchoolId,
    selectedClass,
    selectedAcademicYear,
    selectedSemester,
    isSystemAdmin,
    showClassFilter,
    requireSchoolSelection = false,
}: AnalyticsFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const selectedFilters = buildFilterState({
        selectedSchoolId,
        selectedClass,
        selectedAcademicYear,
        selectedSemester,
    });
    const [optimisticFilters, setOptimisticFilters] = useOptimistic(
        selectedFilters,
        (_currentFilters: FilterState, nextFilters: FilterState) => nextFilters,
    );
    const hasSelectedSchool = requireSchoolSelection
        ? optimisticFilters.school.length > 0
        : optimisticFilters.school !== "all";
    const hasActiveFilters =
        hasSelectedSchool ||
        optimisticFilters.class !== "all" ||
        optimisticFilters.year !== "all" ||
        optimisticFilters.semester !== "all";

    const updateParams = (updates: FilterUpdates): void => {
        const nextFilters = applyFilterUpdates(
            optimisticFilters,
            updates,
            isSystemAdmin,
        );
        const params = new URLSearchParams(searchParams.toString());

        setFilterParams(params, nextFilters);

        const nextUrl = params.size > 0
            ? `${pathname}?${params.toString()}`
            : pathname;

        startTransition(() => {
            setOptimisticFilters(nextFilters);
            router.replace(nextUrl, { scroll: false });
        });
    };

    return (
        <div
            className={
                isPending
                    ? "space-y-4 opacity-70 transition-opacity"
                    : "space-y-4"
            }
            aria-busy={isPending}
        >
            {isSystemAdmin && schools ? (
                <SchoolFilter
                    schools={schools}
                    selectedSchoolId={optimisticFilters.school}
                    requireExplicitSelection={requireSchoolSelection}
                    onSchoolChange={(schoolId) =>
                        updateParams({
                            school: schoolId,
                            class: null,
                            year: null,
                            semester: null,
                        })
                    }
                />
            ) : null}

            {showClassFilter &&
            availableClasses.length > 0 &&
            (!requireSchoolSelection || hasSelectedSchool) ? (
                <ClassFilter
                    availableClasses={availableClasses}
                    currentClass={
                        optimisticFilters.class === "all"
                            ? undefined
                            : optimisticFilters.class
                    }
                    onClassChange={(classValue) =>
                        updateParams({ class: classValue, semester: null })
                    }
                />
            ) : null}

            {availableYears.length > 1 &&
            (!requireSchoolSelection || hasSelectedSchool) ? (
                <AcademicYearFilter
                    availableYears={availableYears}
                    selectedYear={optimisticFilters.year}
                    onYearChange={(yearValue) =>
                        updateParams({ year: yearValue, semester: null })
                    }
                />
            ) : null}

            {availableSemesters.length > 1 &&
            (!requireSchoolSelection || hasSelectedSchool) ? (
                <SemesterFilter
                    availableSemesters={availableSemesters}
                    selectedSemester={optimisticFilters.semester}
                    onSemesterChange={(semesterValue) =>
                        updateParams({ semester: semesterValue })
                    }
                />
            ) : null}

            {hasActiveFilters ? (
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                            updateParams({
                                school: null,
                                class: null,
                                year: null,
                                semester: null,
                            })
                        }
                    >
                        <RotateCcw className="h-4 w-4" />
                        รีเซ็ตตัวกรอง
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
