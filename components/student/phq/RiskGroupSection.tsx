"use client";

import Link from "next/link";
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

interface RiskGroupSectionProps {
    level: RiskLevel;
    students: Student[];
    onStudentClick?: (studentId: string) => void;
}

const LEVEL_CONFIG: Record<
    RiskLevel,
    {
        label: string;
        bgColor: string;
        headerBg: string;
        textColor: string;
    }
> = {
    red: {
        label: "สีแดง",
        bgColor: "bg-red-50",
        headerBg: "bg-red-500",
        textColor: "text-white",
    },
    orange: {
        label: "สีส้ม",
        bgColor: "bg-orange-50",
        headerBg: "bg-orange-500",
        textColor: "text-white",
    },
    yellow: {
        label: "สีเหลือง",
        bgColor: "bg-yellow-50",
        headerBg: "bg-yellow-400",
        textColor: "text-gray-800",
    },
    green: {
        label: "สีเขียว",
        bgColor: "bg-green-50",
        headerBg: "bg-green-500",
        textColor: "text-white",
    },
    blue: {
        label: "สีฟ้า",
        bgColor: "bg-blue-50",
        headerBg: "bg-blue-500",
        textColor: "text-white",
    },
};

export function RiskGroupSection({
    level,
    students,
    onStudentClick,
}: RiskGroupSectionProps) {
    const config = LEVEL_CONFIG[level];

    if (students.length === 0) {
        return null;
    }

    return (
        <div
            className={`rounded-lg overflow-hidden shadow-md border-l-4 ${config.headerBg.replace("bg-", "border-")}`}
        >
            {/* Header */}
            <div className={`${config.headerBg} ${config.textColor} px-4 py-3`}>
                <h3 className="font-semibold">
                    {config.label} ({students.length} คน)
                </h3>
            </div>

            {/* Student List */}
            <div className={`${config.bgColor}`}>
                <table className="w-full">
                    <tbody>
                        {students.map((student, index) => (
                            <tr
                                key={student.id}
                                className={`border-b border-gray-100 last:border-0 hover:bg-pink-50/30 cursor-pointer transition-all duration-200 group`}
                                onClick={() => onStudentClick?.(student.id)}
                            >
                                <td className="px-4 py-3 text-gray-700 font-medium group-hover:text-pink-700 transition-colors">
                                    {index + 1}. {student.firstName}{" "}
                                    {student.lastName}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <Link
                                        href={`/students/${student.id}/help`}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all
                                            ${
                                                level === "red" ||
                                                level === "blue"
                                                    ? "bg-white text-red-500 border border-red-200 hover:bg-red-50"
                                                    : config.headerBg +
                                                      " text-white opacity-90 hover:opacity-100"
                                            }`}
                                    >
                                        {level === "red" || level === "blue"
                                            ? "หลักการพูดคุย"
                                            : "เข้าสู่ระบบใบงาน"}
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
