"use client";

import { useAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsSummaryCards } from "./AnalyticsSummaryCards";
import { AnalyticsSkeleton } from "./AnalyticsSkeleton";
import { buildAnalyticsTabs } from "./AnalyticsTabContent";
import { ClassFilter } from "./filters/ClassFilter";
import { SchoolFilter } from "./filters/SchoolFilter";
import { Tabs } from "@/components/ui/Tabs";
import type { AnalyticsData } from "@/lib/actions/analytics";

interface SchoolOption {
    id: string;
    name: string;
}

interface AnalyticsContentProps {
    initialData: AnalyticsData;
    isSchoolAdmin: boolean;
    schools?: SchoolOption[];
    userRole?: string;
}

export function AnalyticsContent({
    initialData,
    isSchoolAdmin,
    schools,
    userRole,
}: AnalyticsContentProps) {
    const {
        data,
        selectedSchoolId,
        isPending,
        isSystemAdmin,
        showClassFilter,
        pieChartData,
        pieChartTitle,
        handleSchoolChange,
        handleClassChange,
    } = useAnalytics(initialData, isSchoolAdmin, schools, userRole);

    const tabs = buildAnalyticsTabs({
        data,
        pieChartData,
        pieChartTitle,
        showAdminTables: isSchoolAdmin || isSystemAdmin,
    });

    return (
        <>
            <AnalyticsSummaryCards
                totalStudents={data.totalStudents}
                studentsWithAssessment={data.studentsWithAssessment}
                studentsWithoutAssessment={data.studentsWithoutAssessment}
                currentClass={data.currentClass}
            />

            {isSystemAdmin && schools ? (
                <SchoolFilter
                    schools={schools}
                    selectedSchoolId={selectedSchoolId}
                    onSchoolChange={handleSchoolChange}
                />
            ) : null}

            {showClassFilter && data.availableClasses.length > 0 ? (
                <ClassFilter
                    availableClasses={data.availableClasses}
                    currentClass={data.currentClass}
                    onClassChange={handleClassChange}
                />
            ) : null}

            {isPending ? (
                <AnalyticsSkeleton />
            ) : (
                <Tabs tabs={tabs} defaultTab="summary" />
            )}
        </>
    );
}
