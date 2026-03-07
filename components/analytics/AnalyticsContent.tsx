import { Tabs } from "@/components/ui/Tabs";
import { toChartData, getPieChartTitle } from "./utils";
import { AnalyticsFilters } from "./AnalyticsFilters";
import { AnalyticsSummaryCards } from "./AnalyticsSummaryCards";
import { buildAnalyticsTabs } from "./AnalyticsTabContent";
import type { AnalyticsData } from "@/lib/actions/analytics/types";
import type { UserRole } from "@/types/auth.types";

interface SchoolOption {
    id: string;
    name: string;
}

interface AnalyticsContentProps {
    data: AnalyticsData;
    schools?: SchoolOption[];
    userRole: UserRole;
    selectedClass: string;
    selectedSchoolId: string;
    selectedAcademicYear: string;
}

export function AnalyticsContent({
    data,
    schools,
    userRole,
    selectedClass,
    selectedSchoolId,
    selectedAcademicYear,
}: AnalyticsContentProps) {
    const isSystemAdmin = userRole === "system_admin" && !!schools?.length;
    const showClassFilter =
        userRole === "school_admin" ||
        (isSystemAdmin && selectedSchoolId !== "all");
    const selectedSchoolName =
        isSystemAdmin && selectedSchoolId !== "all"
            ? schools?.find((school) => school.id === selectedSchoolId)?.name
            : undefined;
    const pieChartData = toChartData(data.riskLevelSummary);
    const pieChartTitle = getPieChartTitle(
        selectedClass,
        selectedSchoolName,
        userRole,
    );
    const tabs = buildAnalyticsTabs({
        data,
        pieChartData,
        pieChartTitle,
        showAdminTables: userRole === "school_admin" || isSystemAdmin,
        userRole,
    });

    return (
        <>
            <AnalyticsSummaryCards
                totalStudents={data.totalStudents}
                studentsWithAssessment={data.studentsWithAssessment}
                studentsWithoutAssessment={data.studentsWithoutAssessment}
                currentClass={data.currentClass}
            />
            <AnalyticsFilters
                schools={schools}
                availableClasses={data.availableClasses}
                availableYears={data.availableAcademicYears}
                selectedSchoolId={selectedSchoolId}
                selectedClass={selectedClass}
                selectedAcademicYear={selectedAcademicYear}
                isSystemAdmin={isSystemAdmin}
                showClassFilter={showClassFilter}
            />
            <Tabs tabs={tabs} defaultTab="summary" />
        </>
    );
}
