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
    icon = <ClipboardList className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true" />,
    title = "ระบบใบงานช่วยเหลือนักเรียน",
}: HelpPageHeaderProps) {
    return (
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-gray-200/80 bg-linear-to-br from-white to-slate-50 p-4 text-center shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)] sm:mb-8 sm:rounded-3xl sm:p-8">
            <div className="relative z-10">
                <div className="relative mx-auto mb-5 h-20 w-20 sm:mb-6 sm:h-24 sm:w-24">
                    <div
                        className={`relative flex h-full w-full rotate-3 items-center justify-center rounded-2xl text-4xl shadow-lg ring-2 ring-white/30 transition-transform duration-300 hover:rotate-6 hover:scale-105 sm:rounded-3xl ${config.bg} ${config.foreground}`}
                    >
                        {icon}
                    </div>
                </div>

                <h1 className="mb-3 text-2xl font-bold tracking-tight text-gray-800 sm:text-3xl md:text-4xl">
                    {title}
                </h1>

                <div
                    className={`inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border bg-white/90 px-3 py-2 shadow-sm sm:rounded-full sm:px-4 ${config.borderColor}`}
                >
                    <span className="min-w-0 max-w-full break-words font-bold text-gray-700">
                        {studentName}
                    </span>
                    <span className={config.separatorColor} aria-hidden="true">•</span>
                    <span className={`${config.textColor} font-medium`}>
                        {config.text}
                    </span>
                </div>
            </div>
        </div>
    );
}
