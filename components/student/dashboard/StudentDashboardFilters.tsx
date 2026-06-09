"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { ClassFilter } from "./components/ClassFilter";
import { SchoolSelector } from "./components/SchoolSelector";
import { StudentFilterBar } from "./components/StudentFilterBar";
import { isRiskLevel } from "@/lib/constants/risk-levels";
import type {
    ClassOption,
    DashboardRiskFilter,
    RiskLevel,
    SchoolOption,
    StudentGroupCounts,
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
}

type DashboardParamKey = "school" | "class" | "page" | "risk" | "referred";
type DashboardFilterUpdates = Partial<Record<DashboardParamKey, string | null>>;

interface DashboardFilterState {
    schoolId: string;
    className: string;
    riskFilter: DashboardRiskFilter;
    referredOnly: boolean;
}

function buildDashboardFilterState(input: {
    selectedSchoolId: string;
    selectedClass: string;
    selectedRiskFilter: DashboardRiskFilter;
    showReferredOnly: boolean;
}): DashboardFilterState {
    return {
        schoolId: input.selectedSchoolId,
        className: input.selectedClass,
        riskFilter: input.selectedRiskFilter,
        referredOnly: input.showReferredOnly,
    };
}

function resolveOptionalFilter(value: string | null): string {
    if (!value || value === "all") {
        return "";
    }
    return value;
}

function resolveRiskFilter(value: string | null): DashboardRiskFilter {
    if (!value || value === "all") {
        return "all";
    }

    return isRiskLevel(value) ? value : "all";
}

function applyDashboardFilterUpdates(
    current: DashboardFilterState,
    updates: DashboardFilterUpdates,
): DashboardFilterState {
    return {
        schoolId:
            updates.school === undefined
                ? current.schoolId
                : resolveOptionalFilter(updates.school),
        className:
            updates.class === undefined
                ? current.className
                : (resolveOptionalFilter(updates.class) || "all"),
        riskFilter:
            updates.risk === undefined
                ? current.riskFilter
                : resolveRiskFilter(updates.risk),
        referredOnly:
            updates.referred === undefined
                ? current.referredOnly
                : updates.referred === "true",
    };
}

function setOptionalParam(
    params: URLSearchParams,
    key: DashboardParamKey,
    value: string,
): void {
    if (!value || value === "all") {
        params.delete(key);
        return;
    }
    params.set(key, value);
}

function setDashboardFilterParams(
    params: URLSearchParams,
    filters: DashboardFilterState,
): void {
    setOptionalParam(params, "school", filters.schoolId);
    setOptionalParam(params, "class", filters.className);
    setOptionalParam(params, "risk", filters.riskFilter);
    setOptionalParam(params, "referred", filters.referredOnly ? "true" : "");
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
}: StudentDashboardFiltersProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();
    const selectedFilters = buildDashboardFilterState({
        selectedSchoolId,
        selectedClass,
        selectedRiskFilter,
        showReferredOnly,
    });
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
        const nextParams = new URLSearchParams(searchParams.toString());

        setDashboardFilterParams(nextParams, nextFilters);
        if (updates.page !== undefined) {
            setOptionalParam(nextParams, "page", updates.page ?? "");
        }

        const queryString = nextParams.toString();
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
    const scopedClassName =
        optimisticFilters.schoolId === selectedSchoolId
            ? optimisticFilters.className
            : selectedClass;
    const scopedRiskFilter =
        optimisticFilters.schoolId === selectedSchoolId
            ? optimisticFilters.riskFilter
            : selectedRiskFilter;
    const scopedReferredOnly =
        optimisticFilters.schoolId === selectedSchoolId
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
