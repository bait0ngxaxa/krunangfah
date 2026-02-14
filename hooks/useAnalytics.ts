"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import { getAnalyticsSummary } from "@/lib/actions/analytics";
import { toChartData, getPieChartTitle } from "@/components/analytics/utils";
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
    isPending: boolean;
    isSystemAdmin: boolean;
    showClassFilter: boolean;
    pieChartData: RiskPieChartDataItem[];
    pieChartTitle: string;
    handleSchoolChange: (schoolId: string) => void;
    handleClassChange: (classValue: string) => void;
}

export function useAnalytics(
    initialData: AnalyticsData,
    isSchoolAdmin: boolean,
    schools?: SchoolOption[],
    userRole?: string,
): UseAnalyticsReturn {
    const [data, setData] = useState<AnalyticsData>(initialData);
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
    const [isPending, startTransition] = useTransition();

    const isSystemAdmin =
        userRole === "system_admin" && !!schools && schools.length > 0;
    const showClassFilter = isSchoolAdmin || isSystemAdmin;

    const handleSchoolChange = useCallback((schoolId: string): void => {
        setSelectedSchoolId(schoolId);
        setSelectedClass("all");

        const schoolFilter = schoolId === "all" ? undefined : schoolId;
        startTransition(async () => {
            const newData = await getAnalyticsSummary(undefined, schoolFilter);
            if (newData) {
                setData(newData);
            }
        });
    }, []);

    const handleClassChange = useCallback(
        (classValue: string): void => {
            const filterValue = classValue === "all" ? undefined : classValue;
            setSelectedClass(classValue);

            const schoolFilter =
                isSystemAdmin && selectedSchoolId !== "all"
                    ? selectedSchoolId
                    : undefined;

            startTransition(async () => {
                const newData = await getAnalyticsSummary(
                    filterValue,
                    schoolFilter,
                );
                if (newData) {
                    setData(newData);
                }
            });
        },
        [isSystemAdmin, selectedSchoolId],
    );

    const pieChartData = useMemo(
        () => toChartData(data.riskLevelSummary),
        [data.riskLevelSummary],
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
        data,
        selectedClass,
        selectedSchoolId,
        isPending,
        isSystemAdmin,
        showClassFilter,
        pieChartData,
        pieChartTitle,
        handleSchoolChange,
        handleClassChange,
    };
}
