import { ClipboardCheck } from "lucide-react";
import { RiskGroupSection } from "../../phq/RiskGroupSection";
import type { Student, GroupedStudents, RiskLevel } from "../types";

interface ScreeningSummaryProps {
    filteredStudents: Student[];
    groupedStudents: GroupedStudents;
    selectedClass: string;
    classes: string[];
    riskLevels: RiskLevel[];
    onStudentClick: (studentId: string) => void;
}

export function ScreeningSummary({
    filteredStudents,
    groupedStudents,
    selectedClass,
    classes,
    riskLevels,
    onStudentClick,
}: ScreeningSummaryProps) {
    return (
        <div className="space-y-5">
            {/* Summary Header */}
            <div className="relative bg-white/80 backdrop-blur-md rounded-2xl border border-pink-200 shadow-lg shadow-pink-100/30 ring-1 ring-pink-50 overflow-hidden">
                {/* Corner decoration */}
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-linear-to-br from-rose-200/40 to-pink-300/30 rounded-full blur-xl pointer-events-none" />
                <div className="bg-linear-to-r from-rose-500 via-pink-500 to-rose-600 px-5 py-4 flex items-center justify-between relative">
                    <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner ring-1 ring-white/20">
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
                    <span className="bg-white/25 text-white text-xs font-bold px-3.5 py-1.5 rounded-full backdrop-blur-sm shadow-inner ring-1 ring-white/10">
                        {filteredStudents.length} คน
                    </span>
                </div>
            </div>

            {riskLevels.map((level) => (
                <RiskGroupSection
                    key={level}
                    level={level}
                    students={groupedStudents[level]}
                    onStudentClick={onStudentClick}
                />
            ))}
        </div>
    );
}
