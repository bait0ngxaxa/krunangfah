import { Tabs } from "@/components/ui/Tabs";
import { AlertTriangle } from "lucide-react";
import { toChartData, getPieChartTitle } from "./utils";
import { AnalyticsFilters } from "./AnalyticsFilters";
import { AnalyticsSummaryCards } from "./AnalyticsSummaryCards";
import { buildAnalyticsTabs } from "./AnalyticsTabContent";
import { SystemOverviewCards } from "./SystemOverviewCards";
import type {
    AnalyticsData,
    SystemAnalyticsOverview,
} from "@/lib/actions/analytics/types";
import type { UserRole } from "@/types/auth.types";

interface SchoolOption {
    id: string;
    name: string;
}

interface AnalyticsContentProps {
    data: AnalyticsData | null;
    schools?: SchoolOption[];
    userRole: UserRole;
    selectedClass: string;
    selectedSchoolId: string;
    selectedAcademicYear: string;
    selectedSemester: string;
    filterWarnings: string[];
    requireSchoolSelection?: boolean;
    systemOverview?: SystemAnalyticsOverview | null;
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
    requireSchoolSelection = false,
    systemOverview,
}: AnalyticsContentProps) {
    const isSystemAdmin = userRole === "system_admin" && !!schools?.length;
    const showClassFilter =
        userRole === "school_admin" ||
        (isSystemAdmin && selectedSchoolId !== "all");
    const needsSchoolSelection =
        requireSchoolSelection && isSystemAdmin && selectedSchoolId.length === 0;

    if (!data && !needsSchoolSelection) {
        return null;
    }

    if (needsSchoolSelection) {
        return (
            <>
                {filterWarnings.length > 0 ? (
                    <div className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-linear-to-br from-white via-amber-50/60 to-orange-50/50 px-5 py-4 text-amber-900 shadow-[0_14px_30px_-24px_rgba(180,83,9,0.55)]">
                        <div className="pointer-events-none absolute -top-14 -right-14 h-32 w-32 rounded-full bg-amber-200/45 blur-3xl" />
                        <div className="relative z-10 flex items-start gap-2.5">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <div className="space-y-1 text-sm">
                                {filterWarnings.map((warning, index) => (
                                    <p key={`${warning}-${index}`}>{warning}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : null}
                <AnalyticsFilters
                    schools={schools}
                    availableClasses={[]}
                    availableYears={[]}
                    availableSemesters={[]}
                    selectedSchoolId={selectedSchoolId}
                    selectedClass={selectedClass}
                    selectedAcademicYear={selectedAcademicYear}
                    selectedSemester={selectedSemester}
                    isSystemAdmin={isSystemAdmin}
                    showClassFilter={false}
                    requireSchoolSelection={true}
                />
                {systemOverview ? (
                    <SystemOverviewCards overview={systemOverview} />
                ) : null}
                <div className="rounded-3xl border border-cyan-200/70 bg-linear-to-br from-white via-cyan-50/60 to-emerald-50/40 p-6 shadow-[0_16px_35px_-24px_rgba(6,95,70,0.45)]">
                    <p className="text-sm font-semibold text-cyan-800">
                        กรุณาเลือกโรงเรียนก่อนแสดงข้อมูล Analytics
                    </p>
                    <p className="mt-1 text-sm text-cyan-700">
                        ระบบจะเริ่มประมวลผลเมื่อมีการเลือกโรงเรียน เพื่อให้ผลลัพธ์แม่นยำและรองรับข้อมูลจำนวนมากได้ดีขึ้น
                    </p>
                </div>
            </>
        );
    }

    if (!data) {
        return null;
    }

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
                <div className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-linear-to-br from-white via-amber-50/60 to-orange-50/50 px-5 py-4 text-amber-900 shadow-[0_14px_30px_-24px_rgba(180,83,9,0.55)]">
                    <div className="pointer-events-none absolute -top-14 -right-14 h-32 w-32 rounded-full bg-amber-200/45 blur-3xl" />
                    <div className="relative z-10 flex items-start gap-2.5">
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
