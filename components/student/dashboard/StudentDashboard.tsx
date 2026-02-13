"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { RiskGroupSection } from "../phq/RiskGroupSection";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { Users, School, Filter, ClipboardCheck, ChevronDown } from "lucide-react";

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
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 overflow-hidden">
                    <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 px-5 py-3 flex items-center gap-2.5">
                        <School className="w-4.5 h-4.5 text-white/90" />
                        <span className="text-sm font-bold text-white tracking-wide">
                            เลือกโรงเรียน
                        </span>
                    </div>
                    <div className="p-4 sm:p-5">
                        <div className="relative w-full md:w-80">
                            <select
                                value={selectedSchoolId}
                                onChange={(e) => handleSchoolChange(e.target.value)}
                                className="w-full appearance-none px-4 py-2.5 pr-10 border border-pink-100 rounded-xl focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none bg-white/70 backdrop-blur-sm transition-all text-sm font-medium text-gray-700"
                            >
                                <option value="">-- เลือกโรงเรียน --</option>
                                {schools.map((school) => (
                                    <option key={school.id} value={school.id}>
                                        {school.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt to select school */}
            {showSchoolPrompt ? (
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-10 text-center border border-white/60 ring-1 ring-pink-50">
                    <div className="w-18 h-18 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center shadow-inner">
                        <School className="w-9 h-9 text-pink-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                        กรุณาเลือกโรงเรียนเพื่อดูข้อมูล
                    </h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        เลือกโรงเรียนจากเมนูด้านบนเพื่อดูข้อมูลนักเรียนและผลคัดกรอง
                    </p>
                </div>
            ) : (
                <>
                    {/* Class Filter */}
                    {classes.length > 1 && (
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 overflow-hidden">
                            <div className="bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 px-5 py-3 flex items-center gap-2.5">
                                <Filter className="w-4.5 h-4.5 text-white/90" />
                                <span className="text-sm font-bold text-white tracking-wide">
                                    เลือกห้องเรียน
                                </span>
                            </div>
                            <div className="p-4 sm:p-5">
                                <div className="relative w-full md:w-72">
                                    <select
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                        className="w-full appearance-none px-4 py-2.5 pr-10 border border-pink-100 rounded-xl focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none bg-white/70 backdrop-blur-sm transition-all text-sm font-medium text-gray-700"
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
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
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
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-10 text-center border border-white/60 ring-1 ring-pink-50">
                            <div className="w-18 h-18 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center shadow-inner">
                                <Users className="w-9 h-9 text-pink-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">
                                กรุณาเลือกห้องเรียนเพื่อดูรายละเอียด
                            </h3>
                            <p className="text-sm text-gray-500 max-w-sm mx-auto">
                                ข้อมูลนักเรียนทั้งหมด{" "}
                                <span className="font-semibold text-pink-500">
                                    {schoolFilteredStudents.length}
                                </span>{" "}
                                คน ใน{" "}
                                <span className="font-semibold text-pink-500">
                                    {classes.length}
                                </span>{" "}
                                ห้อง
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Summary Header */}
                            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg shadow-pink-100/30 ring-1 ring-pink-50 overflow-hidden">
                                <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 px-5 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                            <ClipboardCheck className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-[15px] font-bold text-white tracking-wide">
                                                สรุปผลการคัดกรอง
                                            </h3>
                                            <p className="text-xs text-white/80 mt-0.5">
                                                {selectedClass === "all"
                                                    ? classes.length === 1
                                                        ? `ห้อง ${classes[0]}`
                                                        : "ทุกห้องเรียน"
                                                    : `ห้อง ${selectedClass}`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="bg-white/25 text-white text-xs font-bold px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                                        {filteredStudents.length} คน
                                    </span>
                                </div>
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
