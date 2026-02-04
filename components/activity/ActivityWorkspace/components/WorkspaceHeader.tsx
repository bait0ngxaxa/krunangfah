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
                className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-bold transition-all hover:bg-white/80 hover:shadow-sm px-4 py-2 rounded-xl backdrop-blur-sm border border-transparent hover:border-pink-200 mb-6"
            >
                <ArrowLeft className="w-5 h-5" />
                <span>กลับหน้าข้อมูลนักเรียน</span>
            </Link>

            {/* Activity Header */}
            <div className="text-center mb-10">
                <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-pink-200 rounded-full blur-xl opacity-50 animate-pulse-slow" />
                    <div
                        className={`w-24 h-24 ${config.bg} rounded-3xl rotate-3 flex items-center justify-center text-white text-4xl shadow-lg relative z-10 transition-transform hover:rotate-6 hover:scale-110`}
                    >
                        📚
                    </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
                    {activityTitle}
                </h1>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 rounded-full border border-pink-100 shadow-sm backdrop-blur-sm">
                    <span className="font-bold text-gray-700">
                        {studentName}
                    </span>
                    <span className="text-pink-300">•</span>
                    <span className="text-pink-600 font-medium">
                        {config.text}
                    </span>
                </div>
            </div>
        </>
    );
}
