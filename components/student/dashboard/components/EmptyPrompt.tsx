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
        <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-10 text-center border border-white/80 ring-1 ring-slate-900/5 overflow-hidden">
            {/* Decorations */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-linear-to-br from-indigo-200/30 to-blue-300/20 rounded-full blur-2xl pointer-events-none opacity-50" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-linear-to-br from-purple-200/20 to-fuchsia-300/15 rounded-full blur-2xl pointer-events-none opacity-50" />
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-indigo-300/30 to-transparent" />

            <div className="relative">
                <div className="relative w-18 h-18 mx-auto mb-5">
                    <div className="absolute inset-0 rounded-2xl bg-indigo-300 blur-xl opacity-20" />
                    <div className="relative w-full h-full rounded-2xl bg-linear-to-br from-indigo-50/80 to-blue-50/80 border border-indigo-100/50 flex items-center justify-center shadow-sm">
                        <Icon className="w-9 h-9 text-indigo-500" />
                    </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 tracking-tight">
                    {title}
                </h3>
                <div className="text-sm text-slate-500 max-w-sm mx-auto font-medium">
                    {description}
                </div>
            </div>
        </div>
    );
}
