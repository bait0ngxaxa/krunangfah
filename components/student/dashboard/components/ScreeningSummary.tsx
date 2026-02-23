import { ClipboardCheck } from "lucide-react";
import { RiskGroupSection } from "../../phq/RiskGroupSection";
import type { Student, GroupedStudents, RiskLevel } from "../types";

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

interface ScreeningSummaryProps {
    displayedStudentCount: number;
    groupedStudents: GroupedStudents;
    selectedClass: string;
    classes: string[];
    riskLevels: RiskLevel[];
    onStudentClick: (studentId: string) => void;
}

export function ScreeningSummary({
    displayedStudentCount,
    groupedStudents,
    selectedClass,
    classes,
    riskLevels,
    onStudentClick,
}: ScreeningSummaryProps) {
    return (
        <div className="space-y-5">
            {/* Summary Header */}
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/80 ring-1 ring-slate-900/5 overflow-hidden">
                {/* Subtle Top Edge Highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-300/30 to-transparent" />

                {/* Corner decoration */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-linear-to-br from-emerald-200/30 to-green-300/20 rounded-full blur-2xl pointer-events-none opacity-60" />

                <div className="px-5 py-4 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-linear-to-br from-violet-50 to-fuchsia-50 rounded-xl border border-violet-100 shadow-sm text-violet-600">
                            <ClipboardCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-[15px] font-extrabold text-slate-800 tracking-tight">
                                สรุปผลการคัดกรอง
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                {selectedClass === "all"
                                    ? classes.length === 1
                                        ? `ห้อง ${classes[0]}`
                                        : "ทุกห้องเรียน"
                                    : `ห้อง ${selectedClass}`}
                            </p>
                        </div>
                    </div>
                    <span className="bg-violet-50 text-violet-700 text-xs font-bold px-3.5 py-1.5 rounded-full border border-violet-100 shadow-sm">
                        {displayedStudentCount} คน
                    </span>
                </div>
            </div>

            {riskLevels.map((level) => (
                <RiskGroupSection
                    key={level}
                    level={level}
                    students={getStudentsByLevel(groupedStudents, level)}
                    onStudentClick={onStudentClick}
                />
            ))}
        </div>
    );
}
