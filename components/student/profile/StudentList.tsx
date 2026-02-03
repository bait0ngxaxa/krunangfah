"use client";

/**
 * Student List Component
 * แสดงรายชื่อนักเรียนแยกตามห้อง
 */

import { useState, useMemo } from "react";
import { StudentCard } from "./StudentCard";
import { RISK_BG_CLASSES, type RiskLevel } from "@/lib/utils/phq-scoring";

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    class: string;
    studentId?: string | null;
    phqResults?: {
        totalScore: number;
        riskLevel: string;
        createdAt: Date;
    }[];
}

interface StudentListProps {
    students: Student[];
    onStudentClick?: (student: Student) => void;
}

export function StudentList({ students, onStudentClick }: StudentListProps) {
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [selectedRisk, setSelectedRisk] = useState<string>("all");

    // Get unique classes
    const classes = useMemo(() => {
        const classSet = new Set(students.map((s) => s.class));
        return Array.from(classSet).sort();
    }, [students]);

    // Filter students
    const filteredStudents = useMemo(() => {
        return students.filter((student) => {
            const classMatch =
                selectedClass === "all" || student.class === selectedClass;
            const riskLevel = student.phqResults?.[0]?.riskLevel || "blue";
            const riskMatch =
                selectedRisk === "all" || riskLevel === selectedRisk;
            return classMatch && riskMatch;
        });
    }, [students, selectedClass, selectedRisk]);

    // Group by class
    const groupedStudents = useMemo(() => {
        const groups: Record<string, Student[]> = {};
        filteredStudents.forEach((student) => {
            if (!groups[student.class]) {
                groups[student.class] = [];
            }
            groups[student.class].push(student);
        });
        return groups;
    }, [filteredStudents]);

    // Risk counts
    const riskCounts = useMemo(() => {
        const counts = { blue: 0, green: 0, yellow: 0, orange: 0, red: 0 };
        students.forEach((student) => {
            const riskLevel = (student.phqResults?.[0]?.riskLevel ||
                "blue") as RiskLevel;
            counts[riskLevel]++;
        });
        return counts;
    }, [students]);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-3">
                {(
                    ["blue", "green", "yellow", "orange", "red"] as RiskLevel[]
                ).map((level) => (
                    <button
                        key={level}
                        onClick={() =>
                            setSelectedRisk(
                                selectedRisk === level ? "all" : level,
                            )
                        }
                        className={`${RISK_BG_CLASSES[level]} rounded-lg p-3 text-white text-center transition-all ${
                            selectedRisk === level
                                ? "ring-4 ring-offset-2 ring-gray-400"
                                : ""
                        }`}
                    >
                        <p className="text-2xl font-bold">
                            {riskCounts[level]}
                        </p>
                        <p className="text-xs opacity-90">คน</p>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">ห้อง:</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                    >
                        <option value="all">ทั้งหมด</option>
                        {classes.map((cls) => (
                            <option key={cls} value={cls}>
                                {cls}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="text-sm text-gray-500">
                    แสดง {filteredStudents.length} จาก {students.length} คน
                </div>
            </div>

            {/* Student List by Class */}
            <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4 rounded-lg border border-gray-200 bg-white/50 p-4">
                {Object.keys(groupedStudents).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>ไม่พบข้อมูลนักเรียน</p>
                    </div>
                ) : (
                    Object.entries(groupedStudents)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([className, classStudents]) => (
                            <div key={className} className="space-y-3">
                                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
                                    {className} ({classStudents.length} คน)
                                </h3>
                                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                    {classStudents.map((student) => (
                                        <StudentCard
                                            key={student.id}
                                            student={student}
                                            onClick={() =>
                                                onStudentClick?.(student)
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
}
