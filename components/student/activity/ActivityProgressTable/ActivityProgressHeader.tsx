import { FileText, Rocket, CalendarDays } from "lucide-react";
import Link from "next/link";
import { getRiskLevelLabel } from "./utils";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import type { AssessmentPeriod } from "./types";
import { buttonVariants } from "@/components/ui/Button";
import { getRiskLevelConfig } from "@/lib/constants/risk-levels";
import { studentHelpStartRoute } from "@/lib/constants/student-routes";

interface ActivityProgressHeaderProps {
    studentId: string;
    phqResultId: string;
    riskLevel: RiskLevel;
    completedCount: number;
    totalCount: number;
    assessmentPeriod: AssessmentPeriod;
    readOnly?: boolean;
}

export function ActivityProgressHeader({
    studentId,
    phqResultId,
    riskLevel,
    completedCount,
    totalCount,
    assessmentPeriod,
    readOnly = false,
}: ActivityProgressHeaderProps) {
    const progressPercent = (completedCount / totalCount) * 100;
    const riskStyle = getRiskLevelConfig(riskLevel);

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-sm flex items-center justify-center">
                    <FileText className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        กิจกรรมช่วยเหลือนักเรียนกลุ่มสี
                        <span className={`ml-2 ${riskStyle.textColor}`}>
                            {getRiskLevelLabel(riskLevel)}
                        </span>
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1">
                        <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-600">
                            ปีการศึกษา {assessmentPeriod.academicYear} เทอม{" "}
                            {assessmentPeriod.semester} ครั้งที่{" "}
                            {assessmentPeriod.assessmentRound}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-500 text-sm font-medium">
                            ความคืบหน้า:
                        </span>
                        <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-linear-to-r from-emerald-400 to-teal-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="text-xs text-gray-500 font-bold">
                            {completedCount}/{totalCount}
                        </span>
                    </div>
                </div>
            </div>
            {!readOnly && (
                <Link
                    href={studentHelpStartRoute(studentId, phqResultId)}
                    className={buttonVariants({
                        variant: "primary",
                        size: "lg",
                    })}
                >
                    <Rocket className="w-5 h-5" />
                    ทำกิจกรรม
                </Link>
            )}
        </div>
    );
}
