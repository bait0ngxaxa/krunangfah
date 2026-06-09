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
        <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/90 p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-indigo-300/30 to-transparent" />

            <div className="relative">
                <div className="relative mx-auto mb-5 h-18 w-18">
                    <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-indigo-100/50 bg-linear-to-br from-indigo-50/80 to-blue-50/80 shadow-sm">
                        <Icon
                            className="h-9 w-9 text-indigo-500"
                            aria-hidden="true"
                        />
                    </div>
                </div>
                <h3 className="mb-2 break-words text-lg font-bold tracking-tight text-slate-800">
                    {title}
                </h3>
                <div className="mx-auto max-w-sm break-words text-sm font-medium text-slate-500">
                    {description}
                </div>
            </div>
        </div>
    );
}
