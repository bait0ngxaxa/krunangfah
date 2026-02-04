import type { ColorTheme } from "@/lib/config/help-page-config";

interface HelpPageHeaderProps {
    studentName: string;
    config: ColorTheme;
    icon?: string;
    title?: string;
}

export function HelpPageHeader({
    studentName,
    config,
    icon = "📋",
    title = "ระบบใบงานช่วยเหลือนักเรียน",
}: HelpPageHeaderProps) {
    return (
        <div className="text-center mb-8 bg-white/40 backdrop-blur-sm rounded-3xl p-8 border border-white/50 shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-r from-white/40 to-pink-50/20 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div
                className={`w-24 h-24 ${config.bg} rounded-3xl rotate-3 flex items-center justify-center text-white text-4xl mx-auto mb-6 shadow-lg relative z-10 hover:rotate-6 hover:scale-110 transition-transform duration-300`}
            >
                {icon}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent mb-3 relative z-10">
                {title}
            </h1>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 rounded-full border border-pink-100 shadow-sm backdrop-blur-md relative z-10">
                <span className="font-bold text-gray-700">{studentName}</span>
                <span className="text-pink-300">•</span>
                <span className="text-pink-600 font-medium">{config.text}</span>
            </div>
        </div>
    );
}
