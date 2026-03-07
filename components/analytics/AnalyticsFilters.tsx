"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { AcademicYearFilter } from "./filters/AcademicYearFilter";
import { ClassFilter } from "./filters/ClassFilter";
import { SchoolFilter } from "./filters/SchoolFilter";

interface SchoolOption {
    id: string;
    name: string;
}

interface AnalyticsFiltersProps {
    schools?: SchoolOption[];
    availableClasses: string[];
    availableYears: number[];
    selectedSchoolId: string;
    selectedClass: string;
    selectedAcademicYear: string;
    isSystemAdmin: boolean;
    showClassFilter: boolean;
}

export function AnalyticsFilters({
    schools,
    availableClasses,
    availableYears,
    selectedSchoolId,
    selectedClass,
    selectedAcademicYear,
    isSystemAdmin,
    showClassFilter,
}: AnalyticsFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

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
                    onSchoolChange={(schoolId) =>
                        updateParams({
                            school: schoolId,
                            class: null,
                            year: null,
                        })
                    }
                />
            ) : null}

            {showClassFilter && availableClasses.length > 0 ? (
                <ClassFilter
                    availableClasses={availableClasses}
                    currentClass={
                        selectedClass === "all" ? undefined : selectedClass
                    }
                    onClassChange={(classValue) =>
                        updateParams({ class: classValue })
                    }
                />
            ) : null}

            {availableYears.length > 1 ? (
                <AcademicYearFilter
                    availableYears={availableYears}
                    selectedYear={selectedAcademicYear}
                    onYearChange={(yearValue) =>
                        updateParams({ year: yearValue })
                    }
                />
            ) : null}
        </div>
    );
}
