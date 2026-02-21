import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyPromptProps {
    icon: LucideIcon;
    title: string;
    description: string | ReactNode;
}

export function EmptyPrompt({
    icon: Icon,
    title,
    description,
}: EmptyPromptProps) {
    return (
        <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 p-10 text-center border border-emerald-200 ring-1 ring-emerald-50 overflow-hidden">
            {/* Decorations */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-linear-to-br from-emerald-200/45 to-green-300/35 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-linear-to-br from-green-200/20 to-emerald-300/15 rounded-full blur-xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-300/40 to-transparent" />

            <div className="relative">
                <div className="relative w-18 h-18 mx-auto mb-5">
                    <div className="absolute inset-0 rounded-2xl bg-emerald-300 blur-lg opacity-30" />
                    <div className="relative w-full h-full rounded-2xl bg-linear-to-br from-emerald-100 to-green-100 flex items-center justify-center shadow-inner ring-1 ring-emerald-200/50">
                        <Icon className="w-9 h-9 text-emerald-500" />
                    </div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                    {title}
                </h3>
                <div className="text-sm text-gray-500 max-w-sm mx-auto">
                    {description}
                </div>
            </div>
        </div>
    );
}
