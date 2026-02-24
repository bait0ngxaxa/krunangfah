import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
    StudentDashboardProps,
    PieChartDataItem,
    GroupedStudents,
    RiskLevel,
} from "./types";
import { RISK_LEVEL_CONFIG } from "@/lib/constants/risk-levels";

export function useStudentDashboard({
    students,
    schools,
    userRole,
}: StudentDashboardProps) {
    const router = useRouter();
    const isSystemAdmin =
        userRole === "system_admin" && schools && schools.length > 0;

    // School filter state (only for system_admin)
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");

    // Students filtered by school (for system_admin)
    const schoolFilteredStudents = useMemo(() => {
        if (!isSystemAdmin || !selectedSchoolId) return students;
        return students.filter((s) => s.schoolId === selectedSchoolId);
    }, [students, selectedSchoolId, isSystemAdmin]);

    // Get unique classes from school-filtered students
    const classes = useMemo(() => {
        const uniqueClasses = [
            ...new Set(schoolFilteredStudents.map((s) => s.class)),
        ];
        return uniqueClasses.sort();
    }, [schoolFilteredStudents]);

    // Class filter state
    const [selectedClass, setSelectedClass] = useState<string>("all");

    // Risk level & referral filter state
    const [selectedRiskFilter, setSelectedRiskFilter] = useState<
        RiskLevel | "all"
    >("all");
    const [showReferredOnly, setShowReferredOnly] = useState<boolean>(false);

    // Reset class filter when school changes
    const handleSchoolChange = (schoolId: string): void => {
        setSelectedSchoolId(schoolId);
        setSelectedClass("all");
        setSelectedRiskFilter("all");
        setShowReferredOnly(false);
    };

    // Reset risk/referral filters when class changes
    const handleClassChange = useCallback((cls: string): void => {
        setSelectedClass(cls);
        setSelectedRiskFilter("all");
        setShowReferredOnly(false);
    }, []);

    // Filtered students (by class)
    const filteredStudents = useMemo(() => {
        if (selectedClass === "all") return schoolFilteredStudents;
        return schoolFilteredStudents.filter((s) => s.class === selectedClass);
    }, [schoolFilteredStudents, selectedClass]);

    // Group students by risk level in a single pass
    const groupedStudents = useMemo(() => {
        const groups: GroupedStudents = {
            red: [],
            orange: [],
            yellow: [],
            green: [],
            blue: [],
        };
        for (const s of filteredStudents) {
            const level = s.phqResults[0]?.riskLevel;
            if (level && level in groups) {
                groups[level as keyof GroupedStudents].push(s);
            }
        }
        return groups;
    }, [filteredStudents]);

    // Count of referred students (for badge display)
    const referredCount = useMemo(() => {
        return filteredStudents.filter((s) => s.referral !== null).length;
    }, [filteredStudents]);

    // Displayed risk levels — filtered by selectedRiskFilter
    const displayedRiskLevels: RiskLevel[] = useMemo(() => {
        const allLevels: RiskLevel[] = [
            "red",
            "orange",
            "yellow",
            "green",
            "blue",
        ];
        if (selectedRiskFilter === "all") return allLevels;
        return [selectedRiskFilter];
    }, [selectedRiskFilter]);

    // Displayed grouped students — filtered by referral toggle
    const displayedGroupedStudents: GroupedStudents = useMemo(() => {
        if (!showReferredOnly) return groupedStudents;
        return {
            red: groupedStudents.red.filter((s) => s.referral !== null),
            orange: groupedStudents.orange.filter((s) => s.referral !== null),
            yellow: groupedStudents.yellow.filter((s) => s.referral !== null),
            green: groupedStudents.green.filter((s) => s.referral !== null),
            blue: groupedStudents.blue.filter((s) => s.referral !== null),
        };
    }, [groupedStudents, showReferredOnly]);

    // Count of displayed (after all filters) students for summary header
    const displayedStudentCount = useMemo(() => {
        let count = 0;
        for (const level of displayedRiskLevels) {
            switch (level) {
                case "red":
                    count += displayedGroupedStudents.red.length;
                    break;
                case "orange":
                    count += displayedGroupedStudents.orange.length;
                    break;
                case "yellow":
                    count += displayedGroupedStudents.yellow.length;
                    break;
                case "green":
                    count += displayedGroupedStudents.green.length;
                    break;
                case "blue":
                    count += displayedGroupedStudents.blue.length;
                    break;
            }
        }
        return count;
    }, [displayedRiskLevels, displayedGroupedStudents]);

    // Pie chart data (ordered from low to high risk) — always shows full data
    const pieChartData: PieChartDataItem[] = useMemo(
        () => [
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
        ],
        [groupedStudents],
    );

    const totalStudents = filteredStudents.length;

    const handleStudentClick = (studentId: string): void => {
        router.push(`/students/${studentId}`);
    };

    // Order: red, orange, yellow, green, blue (high risk first)
    const riskLevels: RiskLevel[] = [
        "red",
        "orange",
        "yellow",
        "green",
        "blue",
    ];

    // Toggle risk filter: click same = reset to "all", click different = select
    const handleRiskFilterChange = useCallback(
        (level: RiskLevel | "all"): void => {
            if (level === "all") {
                setSelectedRiskFilter("all");
                setShowReferredOnly(false);
                return;
            }
            setSelectedRiskFilter((prev) => (prev === level ? "all" : level));
        },
        [],
    );

    const handleReferredToggle = useCallback((): void => {
        setShowReferredOnly((prev) => !prev);
    }, []);

    // system_admin must select a school first
    const showSchoolPrompt = isSystemAdmin && !selectedSchoolId;

    return {
        // State
        selectedSchoolId,
        selectedClass,
        selectedRiskFilter,
        showReferredOnly,
        // Derived data
        schoolFilteredStudents,
        filteredStudents,
        classes,
        groupedStudents,
        displayedGroupedStudents,
        displayedRiskLevels,
        displayedStudentCount,
        referredCount,
        pieChartData,
        totalStudents,
        riskLevels,
        // Flags
        isSystemAdmin,
        showSchoolPrompt,
        // Callbacks
        handleSchoolChange,
        handleClassChange,
        setSelectedClass,
        handleStudentClick,
        handleRiskFilterChange,
        handleReferredToggle,
    };
}
