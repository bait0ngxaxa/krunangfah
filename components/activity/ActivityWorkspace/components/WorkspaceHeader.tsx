import { BookOpen } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { studentRoute } from "@/lib/constants/student-routes";

interface WorkspaceHeaderProps {
    studentId: string;
    studentName: string;
    activityTitle: string;
    config: {
        gradient: string;
        bg: string;
        text: string;
        textColor: string;
        borderColor: string;
        glowBg: string;
        separatorColor: string;
    };
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
            <BackButton
                href={studentRoute(studentId)}
                label="กลับหน้าข้อมูลนักเรียน"
            />

            {/* Activity Header */}
            <div className="text-center mb-10">
                <div className="relative inline-block mb-6">
                    <div className="absolute -inset-4 rounded-full bg-emerald-100/35 blur-2xl" />
                    <div
                        className={`relative z-10 flex h-24 w-24 rotate-3 items-center justify-center rounded-3xl ${config.bg} text-4xl text-white shadow-lg ring-2 ring-white/30 transition-transform hover:rotate-6 hover:scale-105`}
                    >
                        <BookOpen className="w-10 h-10" />
                    </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                    {activityTitle}
                </h1>

                <div
                    className={`inline-flex items-center gap-2 rounded-full border bg-white/90 px-4 py-2 shadow-sm ${config.borderColor}`}
                >
                    <span className="font-bold text-gray-700">
                        {studentName}
                    </span>
                    <span className={config.separatorColor}>•</span>
                    <span className={`${config.textColor} font-medium`}>
                        {config.text}
                    </span>
                </div>
            </div>
        </>
    );
}
