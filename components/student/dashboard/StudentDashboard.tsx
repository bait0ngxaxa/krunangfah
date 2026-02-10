"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { RiskGroupSection } from "../phq/RiskGroupSection";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { Users, School } from "lucide-react";

// Dynamic import for chart component (ssr: false to prevent hydration warnings)
const RiskPieChart = dynamic(
    () =>
        import("@/components/ui/RiskPieChart").then((mod) => ({
            default: mod.RiskPieChart,
        })),
    {
        ssr: false,
        loading: () => (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/50 p-6 border border-white/60 relative overflow-hidden ring-1 ring-pink-50 flex items-center justify-center min-h-[300px]">
                <div className="animate-pulse text-gray-400">
                    กำลังโหลดกราฟ...
                </div>
            </div>
        ),
    },
);

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    studentId?: string | null;
    class: string;
    schoolId?: string;
    phqResults: {
        totalScore: number;
        riskLevel: string;
    }[];
}

interface SchoolOption {
    id: string;
    name: string;
}

interface StudentDashboardProps {
    students: Student[];
    schools?: SchoolOption[];
    userRole?: string;
}

export function StudentDashboard({ students, schools, userRole }: StudentDashboardProps) {
    const router = useRouter();
    const isSystemAdmin = userRole === "system_admin" && schools && schools.length > 0;

    // School filter state (only for system_admin)
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");

    // Students filtered by school (for system_admin)
    const schoolFilteredStudents = useMemo(() => {
        if (!isSystemAdmin || !selectedSchoolId) return students;
        return students.filter((s) => s.schoolId === selectedSchoolId);
    }, [students, selectedSchoolId, isSystemAdmin]);

    // Get unique classes from school-filtered students
    const classes = useMemo(() => {
        const uniqueClasses = [...new Set(schoolFilteredStudents.map((s) => s.class))];
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

    // Group students by risk level
    const groupedStudents = useMemo(
        () => ({
            red: filteredStudents.filter(
                (s) => s.phqResults[0]?.riskLevel === "red",
            ),
            orange: filteredStudents.filter(
                (s) => s.phqResults[0]?.riskLevel === "orange",
            ),
            yellow: filteredStudents.filter(
                (s) => s.phqResults[0]?.riskLevel === "yellow",
            ),
            green: filteredStudents.filter(
                (s) => s.phqResults[0]?.riskLevel === "green",
            ),
            blue: filteredStudents.filter(
                (s) => s.phqResults[0]?.riskLevel === "blue",
            ),
        }),
        [filteredStudents],
    );

    // Pie chart data (ordered from low to high risk)
    const pieChartData = useMemo(
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

    return (
        <div className="space-y-6">
            {/* School Selector - system_admin only */}
            {isSystemAdmin && (
                <div className="bg-white rounded-xl shadow-md p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <School className="w-4 h-4 inline-block mr-1 -mt-0.5" />
                        เลือกโรงเรียน
                    </label>
                    <select
                        value={selectedSchoolId}
                        onChange={(e) => handleSchoolChange(e.target.value)}
                        className="w-full md:w-80 px-4 py-2.5 border border-pink-100 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none bg-white/50 backdrop-blur-sm transition-all"
                    >
                        <option value="">-- เลือกโรงเรียน --</option>
                        {schools.map((school) => (
                            <option key={school.id} value={school.id}>
                                {school.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Prompt to select school */}
            {showSchoolPrompt ? (
                <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg shadow-pink-100/40 p-8 text-center border border-white/60">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-linear-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-2 border-white shadow-sm">
                        <School className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                        กรุณาเลือกโรงเรียนเพื่อดูข้อมูล
                    </h3>
                    <p className="text-gray-500">
                        เลือกโรงเรียนจากเมนูด้านบนเพื่อดูข้อมูลนักเรียนและผลคัดกรอง
                    </p>
                </div>
            ) : (
                <>
                    {/* Class Filter - สำหรับครูนางฟ้าที่เห็นทุกห้อง */}
                    {classes.length > 1 && (
                        <div className="bg-white rounded-xl shadow-md p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                เลือกห้องเรียน
                            </label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full md:w-64 px-4 py-2.5 border border-pink-100 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none bg-white/50 backdrop-blur-sm transition-all"
                            >
                                <option value="all">
                                    ทุกห้อง ({schoolFilteredStudents.length} คน)
                                </option>
                                {classes.map((cls) => {
                                    const count = schoolFilteredStudents.filter(
                                        (s) => s.class === cls,
                                    ).length;
                                    return (
                                        <option key={cls} value={cls}>
                                            {cls} ({count} คน)
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    {/* Pie Chart */}
                    <RiskPieChart
                        data={pieChartData}
                        title={`สรุปภาพรวมนักเรียน (${totalStudents} คน)`}
                        height={280}
                        outerRadius={85}
                    />

                    {/* Student Groups - แสดงเฉพาะเมื่อเลือกห้องเฉพาะ */}
                    {selectedClass === "all" && classes.length > 1 ? (
                        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg shadow-pink-100/40 p-8 text-center border border-white/60">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-linear-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-2 border-white shadow-sm">
                                <Users className="w-8 h-8 text-blue-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">
                                กรุณาเลือกห้องเรียนเพื่อดูรายละเอียด
                            </h3>
                            <p className="text-gray-500">
                                ข้อมูลนักเรียนทั้งหมด {schoolFilteredStudents.length} คน ใน{" "}
                                {classes.length} ห้อง
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-lg shadow-pink-100/40">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                    <span className="text-3xl p-2 bg-pink-50 rounded-lg">
                                        🏫
                                    </span>
                                    <span>
                                        สรุปผลการคัดกรอง:{" "}
                                        <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                                            {selectedClass === "all"
                                                ? classes.length === 1
                                                    ? `ห้อง ${classes[0]}`
                                                    : "ทุกห้องเรียน"
                                                : `ห้อง ${selectedClass}`}
                                        </span>
                                    </span>
                                </h3>
                                <span className="text-sm font-medium text-gray-600 bg-white/50 px-3 py-1 rounded-full border border-gray-100">
                                    นักเรียน {filteredStudents.length} คน
                                </span>
                            </div>

                            {riskLevels.map((level) => (
                                <RiskGroupSection
                                    key={level}
                                    level={level}
                                    students={groupedStudents[level]}
                                    onStudentClick={handleStudentClick}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
