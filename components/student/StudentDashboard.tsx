"use client";

import { useState, useMemo } from "react";
import { RiskPieChart } from "./RiskPieChart";
import { RiskGroupSection } from "./RiskGroupSection";
import type { RiskLevel } from "@/lib/utils/phq-scoring";

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    studentId?: string | null;
    class: string;
    phqResults: {
        totalScore: number;
        riskLevel: string;
    }[];
}

interface StudentDashboardProps {
    students: Student[];
}

export function StudentDashboard({ students }: StudentDashboardProps) {
    // Get unique classes
    const classes = useMemo(() => {
        const uniqueClasses = [...new Set(students.map((s) => s.class))];
        return uniqueClasses.sort();
    }, [students]);

    // Filter state
    const [selectedClass, setSelectedClass] = useState<string>("all");

    // Filtered students
    const filteredStudents = useMemo(() => {
        if (selectedClass === "all") return students;
        return students.filter((s) => s.class === selectedClass);
    }, [students, selectedClass]);

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

    // Count for pie chart
    const riskCounts = {
        red: groupedStudents.red.length,
        orange: groupedStudents.orange.length,
        yellow: groupedStudents.yellow.length,
        green: groupedStudents.green.length,
        blue: groupedStudents.blue.length,
    };

    const handleStudentClick = (studentId: string) => {
        // Navigate to student detail page
        window.location.href = `/students/${studentId}`;
    };

    // Order: red, orange, yellow, green, blue (high risk first)
    const riskLevels: RiskLevel[] = [
        "red",
        "orange",
        "yellow",
        "green",
        "blue",
    ];

    return (
        <div className="space-y-6">
            {/* Class Filter - สำหรับครูนางฟ้าที่เห็นทุกห้อง */}
            {classes.length > 1 && (
                <div className="bg-white rounded-xl shadow-md p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        เลือกห้องเรียน
                    </label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full md:w-64 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">
                            ทุกห้อง ({students.length} คน)
                        </option>
                        {classes.map((cls) => {
                            const count = students.filter(
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
            <RiskPieChart data={riskCounts} />

            {/* Student Groups - แสดงเฉพาะเมื่อเลือกห้องเฉพาะ */}
            {selectedClass === "all" && classes.length > 1 ? (
                <div className="bg-white rounded-xl shadow-md p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg
                            className="w-8 h-8 text-blue-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        กรุณาเลือกห้องเรียนเพื่อดูรายละเอียด
                    </h3>
                    <p className="text-gray-500">
                        ข้อมูลนักเรียนทั้งหมด {students.length} คน ใน{" "}
                        {classes.length} ห้อง
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
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
        </div>
    );
}
