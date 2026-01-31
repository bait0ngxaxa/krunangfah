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
        <div className="text-center mb-8">
            <div
                className={`w-20 h-20 ${config.bg} rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4`}
            >
                {icon}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                {title}
            </h1>
            <p className="text-gray-600">
                {studentName} • {config.text}
            </p>
        </div>
    );
}
