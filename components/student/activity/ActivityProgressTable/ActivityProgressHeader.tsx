import { FileText, Rocket, CalendarDays } from "lucide-react";
import Link from "next/link";
import { getRiskLevelLabel } from "./utils";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import type { AssessmentPeriod } from "./types";

interface ActivityProgressHeaderProps {
    studentId: string;
    phqResultId: string;
    riskLevel: RiskLevel;
    completedCount: number;
    totalCount: number;
    assessmentPeriod: AssessmentPeriod;
}

export function ActivityProgressHeader({
    studentId,
    phqResultId,
    riskLevel,
    completedCount,
    totalCount,
    assessmentPeriod,
}: ActivityProgressHeaderProps) {
    const progressPercent = (completedCount / totalCount) * 100;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-rose-100 flex items-center justify-center">
                    <FileText className="w-7 h-7 text-rose-500" />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        กิจกรรมช่วยเหลือนักเรียนกลุ่มสี
                        <span className="text-pink-600 ml-2">
                            {getRiskLevelLabel(riskLevel)}
                        </span>
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1">
                        <CalendarDays className="w-3.5 h-3.5 text-pink-400" />
                        <span className="text-sm font-medium text-pink-600">
                            ปีการศึกษา {assessmentPeriod.academicYear} เทอม {assessmentPeriod.semester} ครั้งที่ {assessmentPeriod.assessmentRound}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-500 text-sm font-medium">
                            ความคืบหน้า:
                        </span>
                        <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-linear-to-r from-rose-400 to-pink-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="text-xs text-gray-500 font-bold">
                            {completedCount}/{totalCount}
                        </span>
                    </div>
                </div>
            </div>
            <Link
                href={`/students/${studentId}/help/start?phqResultId=${phqResultId}`}
                className="px-6 py-3 bg-linear-to-r from-rose-400 to-pink-500 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-pink-200/50 hover:-translate-y-0.5 transition-all shadow-md shadow-pink-200/50 flex items-center justify-center gap-2"
            >
                <Rocket className="w-5 h-5" />
                ทำกิจกรรม
            </Link>
        </div>
    );
}
