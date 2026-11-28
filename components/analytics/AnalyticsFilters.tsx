"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useTransition, type ReactElement } from "react";
import { RotateCcw } from "lucide-react";

import type { AcademicTermOption } from "@/lib/actions/analytics/types";
import { AcademicYearFilter } from "./filters/AcademicYearFilter";
import { AssessmentRoundFilter } from "./filters/AssessmentRoundFilter";
import { ClassFilter } from "./filters/ClassFilter";
import { SemesterFilter } from "./filters/SemesterFilter";
import { SchoolFilter } from "./filters/SchoolFilter";
import { Button } from "@/components/ui/Button";
import { NamedSubmissionExportButton } from "./NamedSubmissionExportButton";
import {
    applyFilterUpdates,
    buildNamedSubmissionExportUrl,
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
    selectableAcademicTerms: AcademicTermOption[];
    availableRounds: number[];
    selectedSchoolId: string;
    selectedClass: string;
    selectedAcademicYear: string;
    selectedSemester: string;
    selectedRound: string;
    isSystemAdmin: boolean;
    showClassFilter: boolean;
    requireSchoolSelection?: boolean;
    canExportNamedSubmission?: boolean;
    canManageNamedSubmissionExport?: boolean;
    showLegacyClassNote?: boolean;
}

export const LEGACY_CLASS_NOTE =
    "ผลคัดกรองบางส่วนในเทอมนี้นำเข้าก่อนมีการบันทึกห้อง จึงแสดงตามห้องปัจจุบันของนักเรียน";

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values));
}

function uniqueNumbers(values: number[]): number[] {
    return Array.from(new Set(values));
}

export function getSemestersForYear(
    terms: AcademicTermOption[],
    selectedYear: string,
): number[] {
    const year = Number(selectedYear);
    return uniqueNumbers(
        terms
            .filter((term) => selectedYear === "all" || term.year === year)
            .map((term) => term.semester),
    ).sort((left, right) => left - right);
}

export function AnalyticsFilters({
    schools,
    availableClasses,
    selectableAcademicTerms,
    availableRounds,
    selectedSchoolId,
    selectedClass,
    selectedAcademicYear,
    selectedSemester,
    selectedRound,
    isSystemAdmin,
    showClassFilter,
    requireSchoolSelection = false,
    canExportNamedSubmission = false,
    canManageNamedSubmissionExport = false,
    showLegacyClassNote = false,
}: AnalyticsFiltersProps): ReactElement {
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const selectedFilters = buildFilterState({
        selectedSchoolId,
        selectedClass,
        selectedAcademicYear,
        selectedSemester,
        selectedRound,
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
            selectedRound,
        });
    }, [
        selectedAcademicYear,
        selectedClass,
        selectedRound,
        selectedSchoolId,
        selectedSemester,
    ]);

    const hasSelectedSchool = requireSchoolSelection
        ? optimisticFilters.school.length > 0
        : optimisticFilters.school !== "all";
    const isOverview = requireSchoolSelection && !hasSelectedSchool;
    const minimumTermOptions = isOverview ? 1 : 2;
    const hasActiveFilters =
        hasSelectedSchool ||
        optimisticFilters.class !== "all" ||
        optimisticFilters.year !== "all" ||
        optimisticFilters.semester !== "all" ||
        optimisticFilters.round !== "all";
    const safeAvailableClasses = uniqueStrings(availableClasses);
    const safeAvailableYears = uniqueNumbers(
        selectableAcademicTerms.map((term) => term.year),
    ).sort((left, right) => right - left);
    const safeAvailableSemesters = getSemestersForYear(
        selectableAcademicTerms,
        optimisticFilters.year,
    );
    const safeAvailableRounds = uniqueNumbers(availableRounds);

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

    function latestSemesterForYear(year: string): string | undefined {
        return getSemestersForYear(selectableAcademicTerms, year).at(-1)?.toString();
    }

    function handleSchoolChange(school: string): void {
        const { year, semester } = latestFiltersRef.current;
        const updates = { school, class: null, round: null };
        if ((!school || school === "all") && year !== "all" && semester === "all") {
            // A year-wide school view includes every global term of that year.
            const latestSemester = latestSemesterForYear(year);
            updateParams({
                ...updates,
                year: latestSemester === undefined ? null : year,
                semester: latestSemester ?? null,
            });
            return;
        }

        updateParams(updates);
    }

    function handleYearChange(year: string): void {
        const semester = isOverview ? latestSemesterForYear(year) : null;
        if (semester === undefined) return;
        updateParams({ year, semester, round: null });
    }

    return (
        <div
            className={`rounded-3xl bg-white p-3 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)] transition-opacity sm:p-4${isPending ? " opacity-70" : ""}`}
            aria-busy={isPending}
            aria-live="polite"
        >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {isSystemAdmin && schools ? (
                    <div className="col-span-2">
                        <SchoolFilter
                            schools={schools}
                            selectedSchoolId={optimisticFilters.school}
                            requireExplicitSelection={requireSchoolSelection}
                            onSchoolChange={handleSchoolChange}
                            disabled={isPending}
                            variant="field"
                        />
                    </div>
                ) : null}

                {showClassFilter && safeAvailableClasses.length > 0 && !isOverview ? (
                    <div className="col-span-2 lg:col-span-1">
                        <ClassFilter
                            availableClasses={safeAvailableClasses}
                            currentClass={
                                optimisticFilters.class === "all"
                                    ? undefined
                                    : optimisticFilters.class
                            }
                            onClassChange={(classValue) =>
                                updateParams({ class: classValue, semester: null, round: null })
                            }
                            disabled={isPending}
                        />
                    </div>
                ) : null}

                {safeAvailableYears.length >= minimumTermOptions ? (
                    <AcademicYearFilter
                        availableYears={safeAvailableYears}
                        selectedYear={optimisticFilters.year}
                        onYearChange={handleYearChange}
                        disabled={isPending}
                    />
                ) : null}

                {safeAvailableSemesters.length >= minimumTermOptions ? (
                    <SemesterFilter
                        availableSemesters={safeAvailableSemesters}
                        selectedSemester={optimisticFilters.semester}
                        allowAllSemesters={!isOverview}
                        onSemesterChange={(semesterValue) =>
                            updateParams({ semester: semesterValue, round: null })
                        }
                        disabled={isPending}
                    />
                ) : null}

                {safeAvailableRounds.length > 1 && !isOverview ? (
                    <AssessmentRoundFilter
                        availableRounds={safeAvailableRounds}
                        selectedRound={optimisticFilters.round}
                        disabled={isPending}
                        variant="field"
                        onRoundChange={(roundValue) =>
                            updateParams({ round: roundValue })
                        }
                    />
                ) : null}
            </div>

            {showClassFilter && showLegacyClassNote && !isOverview ? (
                <p className="mt-3 text-xs text-slate-500">{LEGACY_CLASS_NOTE}</p>
            ) : null}

            {canManageNamedSubmissionExport || hasActiveFilters ? (
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {canManageNamedSubmissionExport ? (
                        <NamedSubmissionExportButton
                            href={buildNamedSubmissionExportUrl(optimisticFilters)}
                            disabled={isPending || !canExportNamedSubmission}
                        />
                    ) : null}
                    {hasActiveFilters ? (
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={isPending}
                            onClick={() =>
                                updateParams({
                                    school: null,
                                    class: null,
                                    year: null,
                                    semester: null,
                                    round: null,
                                })
                            }
                        >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            รีเซ็ตตัวกรอง
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
