import { RISK_LEVEL_CONFIG } from "@/lib/constants/risk-levels";

import type {
    ClassOption,
    DashboardRiskFilter,
    GroupedStudents,
    PieChartDataItem,
    RiskLevel,
    Student,
    StudentDashboardFilters,
    StudentDashboardProps,
    StudentDashboardView,
    StudentGroupCounts,
} from "./types";

const DASHBOARD_RISK_LEVELS: RiskLevel[] = [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
];

function createEmptyGroups(): GroupedStudents {
    return {
        red: [],
        orange: [],
        yellow: [],
        green: [],
        blue: [],
    };
}

function isRiskLevel(value: string | undefined): value is RiskLevel {
    return DASHBOARD_RISK_LEVELS.includes(value as RiskLevel);
}

function getValidSchoolId(
    schoolId: string | undefined,
    students: Student[],
    schools: { id: string }[] | undefined,
): string {
    if (!schoolId) return "";
    if (schools && schools.length > 0) {
        return schools.some((school) => school.id === schoolId) ? schoolId : "";
    }
    return students.some((student) => student.schoolId === schoolId)
        ? schoolId
        : "";
}

function getValidClass(
    selectedClass: string | undefined,
    classes: string[],
): string {
    if (!selectedClass || selectedClass === "all") return "all";
    return classes.includes(selectedClass) ? selectedClass : "all";
}

function getRiskCounts(groupedStudents: GroupedStudents): StudentGroupCounts {
    return {
        red: groupedStudents.red.length,
        orange: groupedStudents.orange.length,
        yellow: groupedStudents.yellow.length,
        green: groupedStudents.green.length,
        blue: groupedStudents.blue.length,
    };
}

function getDisplayedRiskLevels(
    selectedRiskFilter: DashboardRiskFilter,
): RiskLevel[] {
    if (selectedRiskFilter === "all") return DASHBOARD_RISK_LEVELS;
    return [selectedRiskFilter];
}

function getStudentsByLevel(
    groupedStudents: GroupedStudents,
    level: RiskLevel,
): Student[] {
    switch (level) {
        case "red":
            return groupedStudents.red;
        case "orange":
            return groupedStudents.orange;
        case "yellow":
            return groupedStudents.yellow;
        case "green":
            return groupedStudents.green;
        case "blue":
            return groupedStudents.blue;
    }
}

function getDisplayedStudentCount(
    displayedRiskLevels: RiskLevel[],
    groupedStudents: GroupedStudents,
): number {
    let count = 0;

    for (const level of displayedRiskLevels) {
        count += getStudentsByLevel(groupedStudents, level).length;
    }

    return count;
}

function getPieChartData(groupedStudents: GroupedStudents): PieChartDataItem[] {
    return [
        {
            name: "สีฟ้า",
            value: groupedStudents.blue.length,
            color: RISK_LEVEL_CONFIG.blue.hexColor,
        },
        {
            name: "สีเขียว",
            value: groupedStudents.green.length,
            color: RISK_LEVEL_CONFIG.green.hexColor,
        },
        {
            name: "สีเหลือง",
            value: groupedStudents.yellow.length,
            color: RISK_LEVEL_CONFIG.yellow.hexColor,
        },
        {
            name: "สีส้ม",
            value: groupedStudents.orange.length,
            color: RISK_LEVEL_CONFIG.orange.hexColor,
        },
        {
            name: "สีแดง",
            value: groupedStudents.red.length,
            color: RISK_LEVEL_CONFIG.red.hexColor,
        },
    ];
}

function addStudentToGroup(
    groups: GroupedStudents,
    riskLevel: RiskLevel,
    student: Student,
): void {
    switch (riskLevel) {
        case "red":
            groups.red.push(student);
            return;
        case "orange":
            groups.orange.push(student);
            return;
        case "yellow":
            groups.yellow.push(student);
            return;
        case "green":
            groups.green.push(student);
            return;
        case "blue":
            groups.blue.push(student);
            return;
    }
}

function getGroupedStudents(students: Student[]): GroupedStudents {
    const groups = createEmptyGroups();

    for (const student of students) {
        const riskLevel = student.phqResults[0]?.riskLevel;
        if (isRiskLevel(riskLevel)) {
            addStudentToGroup(groups, riskLevel, student);
        }
    }

    return groups;
}

function getDisplayedGroupedStudents(
    groupedStudents: GroupedStudents,
    showReferredOnly: boolean,
): GroupedStudents {
    if (!showReferredOnly) return groupedStudents;

    return {
        red: groupedStudents.red.filter((student) => student.referral !== null),
        orange: groupedStudents.orange.filter(
            (student) => student.referral !== null,
        ),
        yellow: groupedStudents.yellow.filter(
            (student) => student.referral !== null,
        ),
        green: groupedStudents.green.filter(
            (student) => student.referral !== null,
        ),
        blue: groupedStudents.blue.filter((student) => student.referral !== null),
    };
}

function getClassOptions(students: Student[], classes: string[]): ClassOption[] {
    const counts = new Map<string, number>();

    for (const student of students) {
        counts.set(student.class, (counts.get(student.class) ?? 0) + 1);
    }

    return classes.map((className) => ({
        name: className,
        count: counts.get(className) ?? 0,
    }));
}

export function deriveStudentDashboardView(
    props: StudentDashboardProps,
): StudentDashboardView {
    const filters: StudentDashboardFilters = props.filters ?? {};
    const isSystemAdmin =
        props.userRole === "system_admin" && (props.schools?.length ?? 0) > 0;
    const selectedSchoolId = isSystemAdmin
        ? getValidSchoolId(filters.schoolId, props.students, props.schools)
        : "";
    const schoolFilteredStudents =
        isSystemAdmin && selectedSchoolId
            ? props.students.filter((student) => student.schoolId === selectedSchoolId)
            : props.students;
    const classes = [...new Set(schoolFilteredStudents.map((student) => student.class))]
        .toSorted();
    const classOptions = getClassOptions(schoolFilteredStudents, classes);
    const selectedClass = getValidClass(filters.className, classes);
    const filteredStudents =
        selectedClass === "all"
            ? schoolFilteredStudents
            : schoolFilteredStudents.filter((student) => student.class === selectedClass);
    const groupedStudents = getGroupedStudents(filteredStudents);
    const riskCounts = getRiskCounts(groupedStudents);
    const selectedRiskFilter = isRiskLevel(filters.riskLevel)
        ? filters.riskLevel
        : "all";
    const showReferredOnly = filters.referredOnly === "true";
    const displayedGroupedStudents = getDisplayedGroupedStudents(
        groupedStudents,
        showReferredOnly,
    );
    const displayedRiskLevels = getDisplayedRiskLevels(selectedRiskFilter);
    const displayedStudentCount = getDisplayedStudentCount(
        displayedRiskLevels,
        displayedGroupedStudents,
    );
    const referredCount = filteredStudents.reduce((count, student) => {
        return count + (student.referral !== null ? 1 : 0);
    }, 0);

    return {
        classes,
        classOptions,
        displayedGroupedStudents,
        displayedRiskLevels,
        displayedStudentCount,
        groupedStudents,
        isSystemAdmin,
        pieChartData: getPieChartData(groupedStudents),
        referredCount,
        riskCounts,
        riskLevels: DASHBOARD_RISK_LEVELS,
        schoolFilteredStudentCount: schoolFilteredStudents.length,
        selectedClass,
        selectedRiskFilter,
        selectedSchoolId,
        showReferredOnly,
        showSchoolPrompt: isSystemAdmin && !selectedSchoolId,
        totalStudents: filteredStudents.length,
    };
}
