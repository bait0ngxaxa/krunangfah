import { School, Users } from "lucide-react";
import {
    RISK_CHART_CONFIG,
    RISK_LEVELS,
    isRiskLevel,
} from "@/lib/constants/risk-levels";

import { buildScreeningScopeLabel } from "@/lib/utils/student-result-term";
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
): readonly RiskLevel[] {
    return selectedRiskFilter === "all"
        ? RISK_LEVELS
        : [selectedRiskFilter];
}

function getPieChartData(riskCounts: StudentDashboardProps["riskCounts"]): PieChartDataItem[] {
    return RISK_CHART_CONFIG.map((level) => ({
        name: level.label,
        value: riskCounts[level.key],
        color: level.color,
    }));
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
    const selectedTermId = props.filters?.academicYearId ?? "";
    const scopeLabel = buildScreeningScopeLabel({
        isTermSelected: selectedTermId.length > 0,
        selectedTerm: props.selectedTerm,
        assessmentRound: props.filters?.assessmentRound,
    });
    const unscreenedActive = props.unscreenedFilterApplied === true;
    // Default view only; also kept while active so it can be switched off.
    const unscreenedChip =
        !selectedTermId &&
        typeof props.currentAcademicYear === "number" &&
        ((props.unscreenedThisYearCount ?? 0) > 0 || unscreenedActive)
            ? {
                  academicYear: props.currentAcademicYear,
                  count: props.unscreenedThisYearCount ?? 0,
                  active: unscreenedActive,
              }
            : null;
    const termFilterProps = {
        availableTerms: props.availableTerms ?? [],
        currentAcademicYearId: props.currentAcademicYearId ?? null,
        selectedTermId,
        selectedRound: props.filters?.assessmentRound
            ? String(props.filters.assessmentRound)
            : "",
        selectedTerm: props.selectedTerm ?? null,
        unscreenedChip,
    };

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
                        riskLevels={RISK_LEVELS}
                        schools={props.schools ?? []}
                        selectedClass={selectedClass}
                        selectedRiskFilter={selectedRiskFilter}
                        selectedSchoolId={selectedSchoolId}
                        showReferredOnly={showReferredOnly}
                        showRiskFilters={showRiskFilters}
                        totalStudents={props.totalStudents}
                        {...termFilterProps}
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
                        riskLevels={RISK_LEVELS}
                        schools={props.schools ?? []}
                        selectedClass={selectedClass}
                        selectedRiskFilter={selectedRiskFilter}
                        selectedSchoolId={selectedSchoolId}
                        showReferredOnly={showReferredOnly}
                        showRiskFilters={showRiskFilters}
                        totalStudents={props.totalStudents}
                        {...termFilterProps}
                    />

                    <StudentRiskPieChart
                        data={pieChartData}
                        totalStudents={props.totalStudents}
                        scopeLabel={scopeLabel}
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
                            riskCounts={props.riskCounts}
                            filters={props.filters}
                            pagination={props.pagination}
                            riskLevels={displayedRiskLevels}
                            readOnly={isSystemAdmin}
                            currentAcademicYearId={props.currentAcademicYearId}
                            scopeLabel={scopeLabel}
                            showUnscreenedHint={unscreenedActive}
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
