"use client";

/**
 * Student List Component
 * แสดงรายชื่อนักเรียนแยกตามห้อง
 */

import { useState, useMemo } from "react";
import { School, ClipboardList, BookOpen } from "lucide-react";
import { StudentCard } from "./StudentCard";
import { getRiskBgClass, type RiskLevel } from "@/lib/utils/phq-scoring";

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
        const groups = new Map<string, Student[]>();
        filteredStudents.forEach((student) => {
            const existing = groups.get(student.class);
            if (existing) {
                existing.push(student);
            } else {
                groups.set(student.class, [student]);
            }
        });
        return groups;
    }, [filteredStudents]);

    // Risk counts
    const riskCounts = useMemo(() => {
        const counts = { blue: 0, green: 0, yellow: 0, orange: 0, red: 0 };
        students.forEach((student) => {
            const riskLevel = (student.phqResults?.[0]?.riskLevel ||
                "blue") as RiskLevel;
            switch (riskLevel) {
                case "blue":
                    counts.blue++;
                    break;
                case "green":
                    counts.green++;
                    break;
                case "yellow":
                    counts.yellow++;
                    break;
                case "orange":
                    counts.orange++;
                    break;
                case "red":
                    counts.red++;
                    break;
            }
        });
        return counts;
    }, [students]);

    const riskCardData = [
        {
            level: "blue" as const,
            bgClass: getRiskBgClass("blue"),
            count: riskCounts.blue,
        },
        {
            level: "green" as const,
            bgClass: getRiskBgClass("green"),
            count: riskCounts.green,
        },
        {
            level: "yellow" as const,
            bgClass: getRiskBgClass("yellow"),
            count: riskCounts.yellow,
        },
        {
            level: "orange" as const,
            bgClass: getRiskBgClass("orange"),
            count: riskCounts.orange,
        },
        {
            level: "red" as const,
            bgClass: getRiskBgClass("red"),
            count: riskCounts.red,
        },
    ];

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {riskCardData.map(({ level, bgClass, count }) => (
                    <button
                        key={level}
                        onClick={() =>
                            setSelectedRisk(
                                selectedRisk === level ? "all" : level,
                            )
                        }
                        className={`${bgClass} relative overflow-hidden rounded-2xl p-4 text-white text-center transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1 ${
                            selectedRisk === level
                                ? "ring-4 ring-offset-2 ring-emerald-200 scale-105 z-10 shadow-xl"
                                : "opacity-90 hover:opacity-100"
                        }`}
                    >
                        <div className="absolute inset-0 bg-black/10 opacity-0 hover:opacity-100 transition-opacity" />
                        <p className="text-3xl font-bold mb-1 drop-shadow-sm">
                            {count}
                        </p>
                        <p className="text-xs font-bold opacity-90 uppercase tracking-wider">
                            คน
                        </p>
                    </button>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6 sm:items-center bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2 whitespace-nowrap">
                        <School className="w-5 h-5 text-gray-600" />
                        กรองตามห้องเรียน:
                    </label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full sm:w-auto px-4 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all cursor-pointer hover:border-emerald-200 truncate"
                    >
                        <option value="all">แสดงทั้งหมด</option>
                        {classes.map((cls) => (
                            <option key={cls} value={cls}>
                                {cls}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="h-px sm:h-8 w-full sm:w-px bg-gray-300/50" />

                <div className="text-sm text-gray-600 font-medium">
                    แสดง{" "}
                    <span className="text-emerald-600 font-bold">
                        {filteredStudents.length}
                    </span>{" "}
                    จาก <span className="font-bold">{students.length}</span> คน
                </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto pr-2 space-y-6 rounded-2xl border-2 border-gray-100 bg-slate-50 p-6 custom-scrollbar shadow-inner">
                {groupedStudents.size === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <div className="mb-4 opacity-50">
                            <ClipboardList className="w-10 h-10 text-gray-400 mx-auto" />
                        </div>
                        <p className="font-medium text-lg">
                            ไม่พบข้อมูลนักเรียน
                        </p>
                        <p className="text-sm opacity-70">ลองปรับตัวกรองใหม่</p>
                    </div>
                ) : (
                    Array.from(groupedStudents.entries())
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([className, classStudents]) => (
                            <div key={className} className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-700 border-b-2 border-emerald-100 pb-2 sticky top-0 bg-slate-50 z-10 px-2 py-3 rounded-lg shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-emerald-500" />
                                        ห้อง {className}
                                    </div>
                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                        {classStudents.length} คน
                                    </span>
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
