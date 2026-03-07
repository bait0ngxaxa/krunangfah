"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ClassFilter } from "./components/ClassFilter";
import { SchoolSelector } from "./components/SchoolSelector";
import { StudentFilterBar } from "./components/StudentFilterBar";
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
    riskLevels: RiskLevel[];
    schools: SchoolOption[];
    selectedClass: string;
    selectedRiskFilter: DashboardRiskFilter;
    selectedSchoolId: string;
    showReferredOnly: boolean;
    totalStudents: number;
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
    totalStudents,
}: StudentDashboardFiltersProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    function updateSearchParams(updates: Record<string, string | null>): void {
        const nextParams = new URLSearchParams(searchParams.toString());

        for (const [key, value] of Object.entries(updates)) {
            if (!value || value === "all") {
                nextParams.delete(key);
                continue;
            }
            nextParams.set(key, value);
        }

        const queryString = nextParams.toString();
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
            scroll: false,
        });
    }

    function handleSchoolChange(schoolId: string): void {
        updateSearchParams({
            school: schoolId || null,
            class: null,
            risk: null,
            referred: null,
        });
    }

    function handleClassChange(className: string): void {
        updateSearchParams({
            class: className,
            risk: null,
            referred: null,
        });
    }

    function handleRiskFilterChange(level: DashboardRiskFilter): void {
        if (level === "all") {
            updateSearchParams({ risk: null, referred: null });
            return;
        }

        updateSearchParams({
            risk: selectedRiskFilter === level ? null : level,
        });
    }

    function handleReferredToggle(): void {
        updateSearchParams({
            referred: showReferredOnly ? null : "true",
        });
    }

    return (
        <>
            {isSystemAdmin ? (
                <SchoolSelector
                    schools={schools}
                    selectedSchoolId={selectedSchoolId}
                    onSchoolChange={handleSchoolChange}
                />
            ) : null}

            <ClassFilter
                classOptions={classOptions}
                classes={classes}
                selectedClass={selectedClass}
                totalStudents={totalStudents}
                onClassChange={handleClassChange}
            />

            <StudentFilterBar
                groupedStudentCounts={riskCounts}
                onReferredToggle={handleReferredToggle}
                onRiskFilterChange={handleRiskFilterChange}
                referredCount={referredCount}
                riskLevels={riskLevels}
                selectedRiskFilter={selectedRiskFilter}
                showReferredOnly={showReferredOnly}
            />
        </>
    );
}