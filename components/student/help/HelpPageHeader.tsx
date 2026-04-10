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
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white to-slate-50 p-5 text-center shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)] sm:p-8">
            <div className="relative z-10">
                <div className="relative w-24 h-24 mx-auto mb-6">
                    <div
                        className={`relative flex h-full w-full rotate-3 items-center justify-center rounded-3xl ${config.bg} text-4xl text-white shadow-lg ring-2 ring-white/30 transition-transform duration-300 hover:rotate-6 hover:scale-105`}
                    >
                        {icon}
                    </div>
                </div>

                <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-800 md:text-4xl">
                    {title}
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
        </div>
    );
}
