"use client";

import { useMemo, useCallback, useState } from "react";
import useSWR from "swr";
import { getAnalyticsSummary } from "@/lib/actions/analytics";
import { toChartData, getPieChartTitle } from "@/components/analytics/utils";
import { swrKeys, actionFetcher } from "@/lib/swr/config";
import type { AnalyticsData } from "@/lib/actions/analytics";
import type { RiskPieChartDataItem } from "@/components/ui/RiskPieChart";

interface SchoolOption {
    id: string;
    name: string;
}

interface UseAnalyticsReturn {
    data: AnalyticsData;
    selectedClass: string;
    selectedSchoolId: string;
    selectedAcademicYear: string;
    isPending: boolean;
    isSystemAdmin: boolean;
    showClassFilter: boolean;
    pieChartData: RiskPieChartDataItem[];
    pieChartTitle: string;
    handleSchoolChange: (schoolId: string) => void;
    handleClassChange: (classValue: string) => void;
    handleAcademicYearChange: (yearValue: string) => void;
}

export function useAnalytics(
    initialData: AnalyticsData,
    isSchoolAdmin: boolean,
    schools?: SchoolOption[],
    userRole?: string,
): UseAnalyticsReturn {
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(
        initialData.currentAcademicYear?.toString() ?? "all",
    );

    const isSystemAdmin =
        userRole === "system_admin" && !!schools && schools.length > 0;
    const showClassFilter =
        isSchoolAdmin || (isSystemAdmin && selectedSchoolId !== "all");

    // Build filters for SWR key
    const filters = useMemo(() => {
        const classFilter = selectedClass === "all" ? undefined : selectedClass;
        const schoolFilter =
            isSystemAdmin && selectedSchoolId !== "all" ? selectedSchoolId : undefined;
        const yearFilter =
            selectedAcademicYear !== "all" ? parseInt(selectedAcademicYear, 10) : undefined;

        return { classFilter, schoolFilter, yearFilter };
    }, [selectedClass, selectedSchoolId, selectedAcademicYear, isSystemAdmin]);

    // SWR for analytics data with caching
    const { data, isValidating, mutate } = useSWR(
        swrKeys.analytics(filters),
        actionFetcher(() => getAnalyticsSummary(filters.classFilter, filters.schoolFilter, filters.yearFilter)),
        {
            fallbackData: initialData,
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 2000,
        },
    );

    const handleSchoolChange = useCallback((schoolId: string): void => {
        setSelectedSchoolId(schoolId);
        setSelectedClass("all");
        // Reset to "all" when school changes - will be updated by data.currentAcademicYear from new fetch
        setSelectedAcademicYear("all");
        
        // Fetch with new school
        const newFilters = {
            classFilter: undefined,
            schoolFilter: schoolId === "all" ? undefined : schoolId,
            yearFilter: undefined,
        };
        void mutate(
            actionFetcher(() => getAnalyticsSummary(newFilters.classFilter, newFilters.schoolFilter, newFilters.yearFilter))(),
            { revalidate: false }
        );
    }, [mutate]);

    const handleClassChange = useCallback(
        (classValue: string): void => {
            setSelectedClass(classValue);
            const newFilters = {
                classFilter: classValue === "all" ? undefined : classValue,
                schoolFilter:
                    isSystemAdmin && selectedSchoolId !== "all"
                        ? selectedSchoolId
                        : undefined,
                yearFilter:
                    selectedAcademicYear !== "all"
                        ? parseInt(selectedAcademicYear, 10)
                        : undefined,
            };
            void mutate(
                actionFetcher(() => getAnalyticsSummary(newFilters.classFilter, newFilters.schoolFilter, newFilters.yearFilter))(),
                { revalidate: false }
            );
        },
        [isSystemAdmin, selectedSchoolId, selectedAcademicYear, mutate],
    );

    const handleAcademicYearChange = useCallback(
        (yearValue: string): void => {
            setSelectedAcademicYear(yearValue);
            const newFilters = {
                classFilter: selectedClass !== "all" ? selectedClass : undefined,
                schoolFilter:
                    isSystemAdmin && selectedSchoolId !== "all"
                        ? selectedSchoolId
                        : undefined,
                yearFilter: yearValue !== "all" ? parseInt(yearValue, 10) : undefined,
            };
            void mutate(
                actionFetcher(() => getAnalyticsSummary(newFilters.classFilter, newFilters.schoolFilter, newFilters.yearFilter))(),
                { revalidate: false }
            );
        },
        [isSystemAdmin, selectedSchoolId, selectedClass, mutate],
    );

    const pieChartData = useMemo(
        () => toChartData(data?.riskLevelSummary ?? initialData.riskLevelSummary),
        [data?.riskLevelSummary, initialData.riskLevelSummary],
    );

    const selectedSchoolName =
        isSystemAdmin && selectedSchoolId !== "all"
            ? schools?.find((s) => s.id === selectedSchoolId)?.name
            : undefined;

    const pieChartTitle = getPieChartTitle(
        selectedClass,
        selectedSchoolName,
        userRole,
    );

    return {
        data: data ?? initialData,
        selectedClass,
        selectedSchoolId,
        selectedAcademicYear,
        isPending: isValidating,
        isSystemAdmin,
        showClassFilter,
        pieChartData,
        pieChartTitle,
        handleSchoolChange,
        handleClassChange,
        handleAcademicYearChange,
    };
}
