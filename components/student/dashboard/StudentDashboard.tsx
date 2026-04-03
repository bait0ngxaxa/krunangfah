import { School, Users } from "lucide-react";
import { RISK_LEVEL_CONFIG } from "@/lib/constants/risk-levels";

import { ReferredOutSection } from "../referral/ReferredOutSection";
import { EmptyPrompt } from "./components/EmptyPrompt";
import { ScreeningSummary } from "./components/ScreeningSummary";
import { StudentDashboardFilters } from "./StudentDashboardFilters";
import { StudentRiskPieChart } from "./StudentRiskPieChart";
import type {
    GroupedStudents,
    PieChartDataItem,
    RiskLevel,
    Student,
    StudentDashboardProps,
} from "./types";

const DASHBOARD_RISK_LEVELS: RiskLevel[] = [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
];

function isRiskLevel(value: string | undefined): value is RiskLevel {
    return DASHBOARD_RISK_LEVELS.includes(value as RiskLevel);
}

function createEmptyGroups(): GroupedStudents {
    return {
        red: [],
        orange: [],
        yellow: [],
        green: [],
        blue: [],
    };
}

function getSelectedSchoolId(
    filtersSchoolId: string | undefined,
    schools: { id: string }[] | undefined,
): string {
    if (!filtersSchoolId) {
        return "";
    }

    if (!schools || schools.length === 0) {
        return "";
    }

    return schools.some((school) => school.id === filtersSchoolId)
        ? filtersSchoolId
        : "";
}

function getSelectedClass(
    filtersClassName: string | undefined,
    classes: string[],
): string {
    if (!filtersClassName || filtersClassName === "all") {
        return "all";
    }

    return classes.includes(filtersClassName) ? filtersClassName : "all";
}

function getDisplayedRiskLevels(
    selectedRiskFilter: RiskLevel | "all",
): RiskLevel[] {
    return selectedRiskFilter === "all"
        ? DASHBOARD_RISK_LEVELS
        : [selectedRiskFilter];
}

function getPieChartData(riskCounts: StudentDashboardProps["riskCounts"]): PieChartDataItem[] {
    return [
        { name: "สีฟ้า", value: riskCounts.blue, color: RISK_LEVEL_CONFIG.blue.hexColor },
        { name: "สีเขียว", value: riskCounts.green, color: RISK_LEVEL_CONFIG.green.hexColor },
        { name: "สีเหลือง", value: riskCounts.yellow, color: RISK_LEVEL_CONFIG.yellow.hexColor },
        { name: "สีส้ม", value: riskCounts.orange, color: RISK_LEVEL_CONFIG.orange.hexColor },
        { name: "สีแดง", value: riskCounts.red, color: RISK_LEVEL_CONFIG.red.hexColor },
    ];
}

function groupStudentsByRisk(students: Student[]): GroupedStudents {
    const groups = createEmptyGroups();

    for (const student of students) {
        const riskLevel = student.phqResults[0]?.riskLevel;

        if (!isRiskLevel(riskLevel)) {
            continue;
        }

        switch (riskLevel) {
            case "red":
                groups.red.push(student);
                break;
            case "orange":
                groups.orange.push(student);
                break;
            case "yellow":
                groups.yellow.push(student);
                break;
            case "green":
                groups.green.push(student);
                break;
            case "blue":
                groups.blue.push(student);
                break;
        }
    }

    return groups;
}

export function StudentDashboard(props: StudentDashboardProps) {
    const isSystemAdmin =
        props.userRole === "system_admin" && (props.schools?.length ?? 0) > 0;
    const selectedSchoolId = isSystemAdmin
        ? getSelectedSchoolId(props.filters?.schoolId, props.schools)
        : "";
    const selectedClass = getSelectedClass(
        props.filters?.className,
        props.classes,
    );
    const selectedRiskFilter = isRiskLevel(props.filters?.riskLevel)
        ? props.filters?.riskLevel
        : "all";
    const showReferredOnly = props.filters?.referredOnly === "true";
    const showSchoolPrompt = isSystemAdmin && !selectedSchoolId;
    const showRiskFilters =
        selectedClass !== "all" || props.classes.length <= 1;
    const displayedRiskLevels = getDisplayedRiskLevels(selectedRiskFilter);
    const groupedStudents = groupStudentsByRisk(props.students);
    const displayedStudentCount = props.students.length;
    const pieChartData = getPieChartData(props.riskCounts);

    return (
        <div className="space-y-6">
            {showSchoolPrompt ? (
                <>
                    <StudentDashboardFilters
                        classOptions={props.classOptions}
                        classes={props.classes}
                        isSystemAdmin={isSystemAdmin}
                        referredCount={props.referredCount}
                        riskCounts={props.riskCounts}
                        riskLevels={DASHBOARD_RISK_LEVELS}
                        schools={props.schools ?? []}
                        selectedClass={selectedClass}
                        selectedRiskFilter={selectedRiskFilter}
                        selectedSchoolId={selectedSchoolId}
                        showReferredOnly={showReferredOnly}
                        showRiskFilters={showRiskFilters}
                        totalStudents={props.totalStudents}
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
                        classOptions={props.classOptions}
                        classes={props.classes}
                        isSystemAdmin={isSystemAdmin}
                        referredCount={props.referredCount}
                        riskCounts={props.riskCounts}
                        riskLevels={DASHBOARD_RISK_LEVELS}
                        schools={props.schools ?? []}
                        selectedClass={selectedClass}
                        selectedRiskFilter={selectedRiskFilter}
                        selectedSchoolId={selectedSchoolId}
                        showReferredOnly={showReferredOnly}
                        showRiskFilters={showRiskFilters}
                        totalStudents={props.totalStudents}
                    />

                    <StudentRiskPieChart
                        data={pieChartData}
                        totalStudents={props.totalStudents}
                    />

                    {selectedClass === "all" && props.classes.length > 1 ? (
                        <EmptyPrompt
                            icon={Users}
                            title="กรุณาเลือกห้องเรียนเพื่อดูรายละเอียด"
                            description={
                                <>
                                    ข้อมูลนักเรียนทั้งหมด <span className="font-semibold text-emerald-500">{props.totalStudents}</span>{" "}
                                    คน ใน <span className="font-semibold text-emerald-500">{props.classes.length}</span>{" "}
                                    ห้อง
                                </>
                            }
                        />
                    ) : (
                        <ScreeningSummary
                            displayedStudentCount={displayedStudentCount}
                            filteredStudentCount={props.filteredStudentCount}
                            groupedStudents={groupedStudents}
                            selectedClass={selectedClass}
                            classes={props.classes}
                            filters={props.filters}
                            pagination={props.pagination}
                            riskLevels={displayedRiskLevels}
                            readOnly={isSystemAdmin}
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
