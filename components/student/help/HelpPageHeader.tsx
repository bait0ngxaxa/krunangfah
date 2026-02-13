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
        <div className="relative text-center mb-8 bg-white/40 backdrop-blur-sm rounded-3xl p-8 border border-white/50 shadow-sm overflow-hidden group">
            {/* Decorations */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-linear-to-br from-rose-200/25 to-pink-300/20 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-linear-to-br from-pink-200/20 to-rose-300/15 rounded-full blur-xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />

            <div className="absolute inset-0 bg-linear-to-r from-white/40 to-pink-50/20 opacity-0 group-hover:opacity-100 transition-opacity" />

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

                <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent mb-3">
                    {title}
                </h1>

                <div
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-white/60 rounded-full border ${config.borderColor} shadow-sm backdrop-blur-md`}
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
