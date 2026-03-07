import { School, Users } from "lucide-react";

import { ReferredOutSection } from "../referral/ReferredOutSection";
import { EmptyPrompt } from "./components/EmptyPrompt";
import { ScreeningSummary } from "./components/ScreeningSummary";
import { StudentDashboardFilters } from "./StudentDashboardFilters";
import { StudentRiskPieChart } from "./StudentRiskPieChart";
import { deriveStudentDashboardView } from "./student-dashboard-data";
import type { StudentDashboardProps } from "./types";

export function StudentDashboard(props: StudentDashboardProps) {
    const dashboard = deriveStudentDashboardView(props);

    return (
        <div className="space-y-6">
            {dashboard.showSchoolPrompt ? (
                <>
                    <StudentDashboardFilters
                        classOptions={dashboard.classOptions}
                        classes={dashboard.classes}
                        isSystemAdmin={dashboard.isSystemAdmin}
                        referredCount={dashboard.referredCount}
                        riskCounts={dashboard.riskCounts}
                        riskLevels={dashboard.riskLevels}
                        schools={props.schools ?? []}
                        selectedClass={dashboard.selectedClass}
                        selectedRiskFilter={dashboard.selectedRiskFilter}
                        selectedSchoolId={dashboard.selectedSchoolId}
                        showReferredOnly={dashboard.showReferredOnly}
                        totalStudents={dashboard.schoolFilteredStudentCount}
                    />
                    <EmptyPrompt
                        icon={School}
                        title="กรุณาเลือกโรงเรียนเพื่อดูข้อมูล"
                        description="เลือกโรงเรียนจากเมนูด้านบนเพื่อดูข้อมูลนักเรียนและผลคัดกรอง"
                    />
                </>
            ) : (
                <>
                    <StudentDashboardFilters
                        classOptions={dashboard.classOptions}
                        classes={dashboard.classes}
                        isSystemAdmin={dashboard.isSystemAdmin}
                        referredCount={dashboard.referredCount}
                        riskCounts={dashboard.riskCounts}
                        riskLevels={dashboard.riskLevels}
                        schools={props.schools ?? []}
                        selectedClass={dashboard.selectedClass}
                        selectedRiskFilter={dashboard.selectedRiskFilter}
                        selectedSchoolId={dashboard.selectedSchoolId}
                        showReferredOnly={dashboard.showReferredOnly}
                        totalStudents={dashboard.schoolFilteredStudentCount}
                    />

                    <StudentRiskPieChart
                        data={dashboard.pieChartData}
                        totalStudents={dashboard.totalStudents}
                    />

                    {dashboard.selectedClass === "all" &&
                    dashboard.classes.length > 1 ? (
                        <EmptyPrompt
                            icon={Users}
                            title="กรุณาเลือกห้องเรียนเพื่อดูรายละเอียด"
                            description={
                                <>
                                    ข้อมูลนักเรียนทั้งหมด <span className="font-semibold text-emerald-500">{dashboard.schoolFilteredStudentCount}</span>{" "}
                                    คน ใน <span className="font-semibold text-emerald-500">{dashboard.classes.length}</span>{" "}
                                    ห้อง
                                </>
                            }
                        />
                    ) : (
                        <ScreeningSummary
                            displayedStudentCount={dashboard.displayedStudentCount}
                            groupedStudents={dashboard.displayedGroupedStudents}
                            selectedClass={dashboard.selectedClass}
                            classes={dashboard.classes}
                            riskLevels={dashboard.displayedRiskLevels}
                            readOnly={dashboard.isSystemAdmin}
                        />
                    )}

                    {props.referredOutStudents &&
                    props.referredOutStudents.length > 0 ? (
                        <ReferredOutSection students={props.referredOutStudents} />
                    ) : null}
                </>
            )}
        </div>
    );
}