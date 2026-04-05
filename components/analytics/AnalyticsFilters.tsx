"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
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
    const hasSelectedSchool = requireSchoolSelection
        ? selectedSchoolId.length > 0
        : selectedSchoolId !== "all";
    const hasActiveFilters =
        hasSelectedSchool ||
        selectedClass !== "all" ||
        selectedAcademicYear !== "all" ||
        selectedSemester !== "all";

    const updateParams = (updates: Record<string, string | null>): void => {
        const params = new URLSearchParams(searchParams.toString());

        for (const [key, value] of Object.entries(updates)) {
            if (!value || value === "all") {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        }

        const nextUrl = params.size > 0
            ? `${pathname}?${params.toString()}`
            : pathname;

        startTransition(() => {
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
                    selectedSchoolId={selectedSchoolId}
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
                        selectedClass === "all" ? undefined : selectedClass
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
                    selectedYear={selectedAcademicYear}
                    onYearChange={(yearValue) =>
                        updateParams({ year: yearValue, semester: null })
                    }
                />
            ) : null}

            {availableSemesters.length > 1 &&
            (!requireSchoolSelection || hasSelectedSchool) ? (
                <SemesterFilter
                    availableSemesters={availableSemesters}
                    selectedSemester={selectedSemester}
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
