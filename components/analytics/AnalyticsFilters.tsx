"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { RotateCcw } from "lucide-react";

import { AcademicYearFilter } from "./filters/AcademicYearFilter";
import { ClassFilter } from "./filters/ClassFilter";
import { SemesterFilter } from "./filters/SemesterFilter";
import { SchoolFilter } from "./filters/SchoolFilter";
import { Button } from "@/components/ui/Button";
import {
    applyFilterUpdates,
    buildFilterState,
    buildFilterUrl,
    type FilterState,
    type FilterUpdates,
} from "./filter-state";

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

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values));
}

function uniqueNumbers(values: number[]): number[] {
    return Array.from(new Set(values));
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
    const latestFiltersRef = useRef<FilterState>(selectedFilters);

    useEffect(() => {
        latestFiltersRef.current = buildFilterState({
            selectedSchoolId,
            selectedClass,
            selectedAcademicYear,
            selectedSemester,
        });
    }, [
        selectedAcademicYear,
        selectedClass,
        selectedSchoolId,
        selectedSemester,
    ]);

    const hasSelectedSchool = requireSchoolSelection
        ? optimisticFilters.school.length > 0
        : optimisticFilters.school !== "all";
    const hasActiveFilters =
        hasSelectedSchool ||
        optimisticFilters.class !== "all" ||
        optimisticFilters.year !== "all" ||
        optimisticFilters.semester !== "all";
    const safeAvailableClasses = uniqueStrings(availableClasses);
    const safeAvailableYears = uniqueNumbers(availableYears);
    const safeAvailableSemesters = uniqueNumbers(availableSemesters);

    const updateParams = (updates: FilterUpdates): void => {
        const nextFilters = applyFilterUpdates(
            latestFiltersRef.current,
            updates,
            isSystemAdmin,
        );
        latestFiltersRef.current = nextFilters;
        const nextUrl = buildFilterUrl(pathname, nextFilters);

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
            aria-live="polite"
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
            safeAvailableClasses.length > 0 &&
            (!requireSchoolSelection || hasSelectedSchool) ? (
                <ClassFilter
                    availableClasses={safeAvailableClasses}
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

            {safeAvailableYears.length > 1 &&
            (!requireSchoolSelection || hasSelectedSchool) ? (
                <AcademicYearFilter
                    availableYears={safeAvailableYears}
                    selectedYear={optimisticFilters.year}
                    onYearChange={(yearValue) =>
                        updateParams({ year: yearValue, semester: null })
                    }
                />
            ) : null}

            {safeAvailableSemesters.length > 1 &&
            (!requireSchoolSelection || hasSelectedSchool) ? (
                <SemesterFilter
                    availableSemesters={safeAvailableSemesters}
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
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        รีเซ็ตตัวกรอง
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
