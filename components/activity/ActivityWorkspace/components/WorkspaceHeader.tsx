import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface WorkspaceHeaderProps {
    studentId: string;
    studentName: string;
    activityTitle: string;
    config: { gradient: string; bg: string; text: string };
}

/**
 * Header section with back button and activity info
 */
export function WorkspaceHeader({
    studentId,
    studentName,
    activityTitle,
    config,
}: WorkspaceHeaderProps) {
    return (
        <>
            {/* Back Button */}
            <Link
                href={`/students/${studentId}`}
                className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-pink-50 px-4 py-2 rounded-full mb-6"
            >
                <ArrowLeft className="w-5 h-5" />
                <span>กลับหน้าข้อมูลนักเรียน</span>
            </Link>

            {/* Activity Header */}
            <div className="text-center mb-8">
                <div
                    className={`w-20 h-20 ${config.bg} rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4`}
                >
                    📚
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                    {activityTitle}
                </h1>
                <p className="text-gray-600">
                    {studentName} • {config.text}
                </p>
            </div>
        </>
    );
}
