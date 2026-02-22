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
import { ReferredOutSection } from "../referral/ReferredOutSection";
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
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/80 ring-1 ring-slate-900/5 p-6 overflow-hidden flex items-center justify-center min-h-[300px]">
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-300/30 to-transparent" />
                <div className="animate-pulse text-slate-400 font-medium">
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
                                    <span className="font-semibold text-emerald-500">
                                        {
                                            dashboard.schoolFilteredStudents
                                                .length
                                        }
                                    </span>{" "}
                                    คน ใน{" "}
                                    <span className="font-semibold text-emerald-500">
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

                    {/* Referred Out Students - class_teacher only */}
                    {props.referredOutStudents && props.referredOutStudents.length > 0 && (
                        <ReferredOutSection students={props.referredOutStudents} />
                    )}
                </>
            )}
        </div>
    );
}
