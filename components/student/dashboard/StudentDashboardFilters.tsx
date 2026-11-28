"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { ClassFilter } from "./components/ClassFilter";
import { SchoolSelector } from "./components/SchoolSelector";
import { StudentFilterBar } from "./components/StudentFilterBar";
import { TermFilter } from "./components/TermFilter";
import {
    applyDashboardFilterUpdates,
    buildDashboardQueryString,
    roundChangeUpdates,
    termChangeUpdates,
    type DashboardFilterState,
    type DashboardFilterUpdates,
} from "./filter-params";
import type {
    AvailableStudentTerm,
    ClassOption,
    DashboardRiskFilter,
    RiskLevel,
    SchoolOption,
    StudentGroupCounts,
    StudentResultTerm,
} from "./types";

interface StudentDashboardFiltersProps {
    classOptions: ClassOption[];
    classes: string[];
    isSystemAdmin: boolean;
    referredCount: number;
    riskCounts: StudentGroupCounts;
    riskLevels: readonly RiskLevel[];
    schools: SchoolOption[];
    selectedClass: string;
    selectedRiskFilter: DashboardRiskFilter;
    selectedSchoolId: string;
    showReferredOnly: boolean;
    showRiskFilters: boolean;
    totalStudents: number;
    availableTerms?: AvailableStudentTerm[];
    currentAcademicYearId?: string | null;
    selectedTermId?: string;
    selectedRound?: string;
    selectedTerm?: StudentResultTerm | null;
}

export function StudentDashboardFilters({
    classOptions,
    classes,
    isSystemAdmin,
    referredCount,
    riskCounts,
    riskLevels,
    schools,
    selectedClass,
    selectedRiskFilter,
    selectedSchoolId,
    showReferredOnly,
    showRiskFilters,
    totalStudents,
    availableTerms = [],
    currentAcademicYearId = null,
    selectedTermId = "",
    selectedRound = "",
    selectedTerm = null,
}: StudentDashboardFiltersProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();
    const selectedFilters: DashboardFilterState = {
        schoolId: selectedSchoolId,
        className: selectedClass,
        riskFilter: selectedRiskFilter,
        referredOnly: showReferredOnly,
        termId: selectedTermId,
        round: selectedRound,
    };
    const [optimisticFilters, setOptimisticFilters] = useOptimistic(
        selectedFilters,
        (
            _currentFilters: DashboardFilterState,
            nextFilters: DashboardFilterState,
        ) => nextFilters,
    );

    function updateSearchParams(updates: DashboardFilterUpdates): void {
        const nextFilters = applyDashboardFilterUpdates(
            optimisticFilters,
            updates,
        );
        const queryString = buildDashboardQueryString(
            new URLSearchParams(searchParams.toString()),
            nextFilters,
            updates,
        );
        startTransition(() => {
            setOptimisticFilters(nextFilters);
            router.replace(
                queryString ? `${pathname}?${queryString}` : pathname,
                { scroll: false },
            );
        });
    }

    function handleSchoolChange(schoolId: string): void {
        updateSearchParams({
            school: schoolId || null,
            class: null,
            page: null,
            risk: null,
            referred: null,
        });
    }

    function handleClassChange(className: string): void {
        updateSearchParams({
            class: className,
            page: null,
            risk: null,
            referred: null,
        });
    }

    function handleRiskFilterChange(level: DashboardRiskFilter): void {
        if (level === "all") {
            updateSearchParams({ page: null, risk: null, referred: null });
            return;
        }

        updateSearchParams({
            page: null,
            risk: optimisticFilters.riskFilter === level ? null : level,
        });
    }

    function handleReferredToggle(): void {
        updateSearchParams({
            page: null,
            referred: optimisticFilters.referredOnly ? null : "true",
        });
    }

    const shouldShowScopedFilters = !isSystemAdmin || selectedSchoolId.length > 0;
    const isSameSchool = optimisticFilters.schoolId === selectedSchoolId;
    const scopedClassName = isSameSchool
        ? optimisticFilters.className
        : selectedClass;
    const scopedRiskFilter = isSameSchool
        ? optimisticFilters.riskFilter
        : selectedRiskFilter;
    const scopedReferredOnly = isSameSchool
        ? optimisticFilters.referredOnly
        : showReferredOnly;

    return (
        <>
            {isSystemAdmin ? (
                <SchoolSelector
                    schools={schools}
                    selectedSchoolId={optimisticFilters.schoolId}
                    onSchoolChange={handleSchoolChange}
                />
            ) : null}

            {shouldShowScopedFilters ? (
                <TermFilter
                    availableTerms={availableTerms}
                    currentAcademicYearId={currentAcademicYearId}
                    selectedTermId={optimisticFilters.termId}
                    selectedRound={optimisticFilters.round}
                    selectedTerm={selectedTerm}
                    onTermChange={(termId) => updateSearchParams(termChangeUpdates(termId))}
                    onRoundChange={(round) => updateSearchParams(roundChangeUpdates(round))}
                />
            ) : null}

            {shouldShowScopedFilters ? (
                <ClassFilter
                    classOptions={classOptions}
                    classes={classes}
                    selectedClass={scopedClassName}
                    totalStudents={totalStudents}
                    onClassChange={handleClassChange}
                />
            ) : null}

            {shouldShowScopedFilters && showRiskFilters ? (
                <StudentFilterBar
                    groupedStudentCounts={riskCounts}
                    onReferredToggle={handleReferredToggle}
                    onRiskFilterChange={handleRiskFilterChange}
                    referredCount={referredCount}
                    riskLevels={riskLevels}
                    selectedRiskFilter={scopedRiskFilter}
                    showReferredOnly={scopedReferredOnly}
                />
            ) : null}
        </>
    );
}
