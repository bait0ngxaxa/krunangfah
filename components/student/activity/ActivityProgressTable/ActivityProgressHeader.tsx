import { FileText } from "lucide-react";
import Link from "next/link";
import { getRiskLevelLabel } from "./utils";
import type { RiskLevel } from "@/lib/utils/phq-scoring";

interface ActivityProgressHeaderProps {
    studentId: string;
    riskLevel: RiskLevel;
    completedCount: number;
    totalCount: number;
}

export function ActivityProgressHeader({
    studentId,
    riskLevel,
    completedCount,
    totalCount,
}: ActivityProgressHeaderProps) {
    const progressPercent = (completedCount / totalCount) * 100;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-linear-to-br from-rose-400 to-pink-500 rounded-2xl rotate-3 flex items-center justify-center text-white shadow-lg shadow-pink-200">
                    <FileText className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        กิจกรรมช่วยเหลือนักเรียนกลุ่มสี
                        <span className="text-pink-600 ml-2">
                            {getRiskLevelLabel(riskLevel)}
                        </span>
                    </h2>
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
                href={`/students/${studentId}/help/start`}
                className="px-6 py-3 bg-linear-to-r from-rose-500 to-pink-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-pink-200 hover:-translate-y-0.5 transition-all shadow-md flex items-center justify-center gap-2"
            >
                <span>🚀</span>
                ทำกิจกรรม
            </Link>
        </div>
    );
}
