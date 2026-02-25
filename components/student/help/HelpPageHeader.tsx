import { ClipboardList } from "lucide-react";
import type { ColorTheme } from "@/lib/config/help-page-config";

interface HelpPageHeaderProps {
    studentName: string;
    config: ColorTheme;
    icon?: React.ReactNode;
    title?: string;
}

export function HelpPageHeader({
    studentName,
    config,
    icon = <ClipboardList className="w-10 h-10 text-white" />,
    title = "ระบบใบงานช่วยเหลือนักเรียน",
}: HelpPageHeaderProps) {
    return (
        <div className="relative text-center mb-8 bg-white rounded-3xl p-5 sm:p-8 border-2 border-gray-100 shadow-sm overflow-hidden group">
            <div className="relative z-10">
                <div className="relative w-24 h-24 mx-auto mb-6">
                    <div
                        className={`absolute inset-0 rounded-3xl ${config.bg} blur-lg opacity-25`}
                    />
                    <div
                        className={`relative w-full h-full ${config.bg} rounded-3xl rotate-3 flex items-center justify-center text-white text-4xl shadow-inner ring-2 ring-white/20 hover:rotate-6 hover:scale-110 transition-transform duration-300`}
                    >
                        {icon}
                    </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                    {title}
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
        </div>
    );
}
