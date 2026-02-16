"use client";

import dynamic from "next/dynamic";
import { School, Users } from "lucide-react";
import { useStudentDashboard } from "./useStudentDashboard";
import {
    SchoolSelector,
    ClassFilter,
    EmptyPrompt,
    ScreeningSummary,
} from "./components";
import type { StudentDashboardProps } from "./types";

// Dynamic import for chart component (ssr: false to prevent hydration warnings)
const RiskPieChart = dynamic(
    () =>
        import("@/components/ui/RiskPieChart").then((mod) => ({
            default: mod.RiskPieChart,
        })),
    {
        ssr: false,
        loading: () => (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/50 p-6 border border-pink-200 relative overflow-hidden ring-1 ring-pink-50 flex items-center justify-center min-h-[300px]">
                <div className="animate-pulse text-gray-400">
                    กำลังโหลดกราฟ...
                </div>
            </div>
        ),
    },
);

export function StudentDashboard(props: StudentDashboardProps) {
    const dashboard = useStudentDashboard(props);

    return (
        <div className="space-y-6">
            {/* School Selector - system_admin only */}
            {dashboard.isSystemAdmin ? (
                <SchoolSelector
                    schools={props.schools ?? []}
                    selectedSchoolId={dashboard.selectedSchoolId}
                    onSchoolChange={dashboard.handleSchoolChange}
                />
            ) : null}

            {/* Prompt to select school */}
            {dashboard.showSchoolPrompt ? (
                <EmptyPrompt
                    icon={School}
                    title="กรุณาเลือกโรงเรียนเพื่อดูข้อมูล"
                    description="เลือกโรงเรียนจากเมนูด้านบนเพื่อดูข้อมูลนักเรียนและผลคัดกรอง"
                />
            ) : (
                <>
                    {/* Class Filter */}
                    <ClassFilter
                        classes={dashboard.classes}
                        selectedClass={dashboard.selectedClass}
                        onClassChange={dashboard.setSelectedClass}
                        schoolFilteredStudents={
                            dashboard.schoolFilteredStudents
                        }
                    />

                    {/* Pie Chart */}
                    <RiskPieChart
                        data={dashboard.pieChartData}
                        title={`สรุปภาพรวมนักเรียน (${dashboard.totalStudents} คน)`}
                        height={280}
                        outerRadius={85}
                    />

                    {/* Student Groups - show only when specific class selected */}
                    {dashboard.selectedClass === "all" &&
                    dashboard.classes.length > 1 ? (
                        <EmptyPrompt
                            icon={Users}
                            title="กรุณาเลือกห้องเรียนเพื่อดูรายละเอียด"
                            description={
                                <>
                                    ข้อมูลนักเรียนทั้งหมด{" "}
                                    <span className="font-semibold text-pink-500">
                                        {
                                            dashboard.schoolFilteredStudents
                                                .length
                                        }
                                    </span>{" "}
                                    คน ใน{" "}
                                    <span className="font-semibold text-pink-500">
                                        {dashboard.classes.length}
                                    </span>{" "}
                                    ห้อง
                                </>
                            }
                        />
                    ) : (
                        <ScreeningSummary
                            filteredStudents={dashboard.filteredStudents}
                            groupedStudents={dashboard.groupedStudents}
                            selectedClass={dashboard.selectedClass}
                            classes={dashboard.classes}
                            riskLevels={dashboard.riskLevels}
                            onStudentClick={dashboard.handleStudentClick}
                        />
                    )}
                </>
            )}
        </div>
    );
}
