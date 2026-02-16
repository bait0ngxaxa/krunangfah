import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
    StudentDashboardProps,
    PieChartDataItem,
    GroupedStudents,
    RiskLevel,
} from "./types";

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

    // Reset class filter when school changes
    const handleSchoolChange = (schoolId: string): void => {
        setSelectedSchoolId(schoolId);
        setSelectedClass("all");
    };

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

    // Pie chart data (ordered from low to high risk)
    const pieChartData: PieChartDataItem[] = useMemo(
        () => [
            {
                name: "สีฟ้า",
                value: groupedStudents.blue.length,
                color: "#3B82F6",
            },
            {
                name: "สีเขียว",
                value: groupedStudents.green.length,
                color: "#22C55E",
            },
            {
                name: "สีเหลือง",
                value: groupedStudents.yellow.length,
                color: "#EAB308",
            },
            {
                name: "สีส้ม",
                value: groupedStudents.orange.length,
                color: "#F97316",
            },
            {
                name: "สีแดง",
                value: groupedStudents.red.length,
                color: "#EF4444",
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

    // system_admin must select a school first
    const showSchoolPrompt = isSystemAdmin && !selectedSchoolId;

    return {
        // State
        selectedSchoolId,
        selectedClass,
        // Derived data
        schoolFilteredStudents,
        filteredStudents,
        classes,
        groupedStudents,
        pieChartData,
        totalStudents,
        riskLevels,
        // Flags
        isSystemAdmin,
        showSchoolPrompt,
        // Callbacks
        handleSchoolChange,
        setSelectedClass,
        handleStudentClick,
    };
}
