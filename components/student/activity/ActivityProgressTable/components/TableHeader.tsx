// components/student/activity/ActivityProgressTable/components/TableHeader.tsx

import { FileText } from "lucide-react";
import Link from "next/link";
import type { TableHeaderProps } from "../types";

/**
 * Header section with title and action button
 */
export function TableHeader({
    studentId,
    riskLevel,
    completedCount,
    totalCount,
}: TableHeaderProps) {
    const getRiskLevelLabel = (level: string): string => {
        switch (level) {
            case "orange":
                return "ส้ม";
            case "yellow":
                return "เหลือง";
            case "green":
                return "เขียว";
            default:
                return level;
        }
    };

    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white">
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                        กิจกรรมช่วยเหลือนักเรียนกลุ่มสี
                        {getRiskLevelLabel(riskLevel)}
                    </h2>
                    <p className="text-gray-600 text-sm">
                        เสร็จแล้ว {completedCount}/{totalCount} กิจกรรม
                    </p>
                </div>
            </div>
            <Link
                href={`/students/${studentId}/help/start`}
                className="px-4 py-2 bg-purple-500 text-white rounded-full text-sm font-medium hover:bg-purple-600 transition-colors"
            >
                ทำกิจกรรม
            </Link>
        </div>
    );
}
