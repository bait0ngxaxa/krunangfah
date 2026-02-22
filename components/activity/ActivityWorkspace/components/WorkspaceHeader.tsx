import { BookOpen } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";

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
                href={`/students/${studentId}`}
                label="กลับหน้าข้อมูลนักเรียน"
            />

            {/* Activity Header */}
            <div className="text-center mb-10">
                <div className="relative inline-block mb-6">
                    <div
                        className={`w-24 h-24 ${config.bg} rounded-3xl rotate-3 flex items-center justify-center text-white text-4xl shadow-lg relative z-10 transition-transform hover:rotate-6 hover:scale-110`}
                    >
                        <BookOpen className="w-10 h-10" />
                    </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                    {activityTitle}
                </h1>

                <div
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border-2 ${config.borderColor} shadow-sm`}
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
