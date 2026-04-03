import { Tabs } from "@/components/ui/Tabs";
import { AlertTriangle } from "lucide-react";
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
    selectedSemester: string;
    filterWarnings: string[];
}

export function AnalyticsContent({
    data,
    schools,
    userRole,
    selectedClass,
    selectedSchoolId,
    selectedAcademicYear,
    selectedSemester,
    filterWarnings,
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
            {filterWarnings.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-amber-900">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <div className="space-y-1 text-sm">
                            {filterWarnings.map((warning, index) => (
                                <p key={`${warning}-${index}`}>{warning}</p>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}
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
                availableSemesters={data.availableSemesters}
                selectedSchoolId={selectedSchoolId}
                selectedClass={selectedClass}
                selectedAcademicYear={selectedAcademicYear}
                selectedSemester={selectedSemester}
                isSystemAdmin={isSystemAdmin}
                showClassFilter={showClassFilter}
            />
            <Tabs tabs={tabs} defaultTab="summary" />
        </>
    );
}
