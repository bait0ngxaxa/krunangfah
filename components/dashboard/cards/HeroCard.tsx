import Link from "next/link";
import { ChevronRight, Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface HeroCardProps {
    href: string;
    icon: LucideIcon;
    title: string;
    badge?: string | ReactNode;
    description: string;
    show?: boolean;
    /** When true, renders an empty state UI instead of the normal clickable card */
    isEmpty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
}

export function HeroCard({
    href,
    icon: Icon,
    title,
    badge,
    description,
    show = true,
    isEmpty = false,
    emptyTitle,
    emptyDescription,
}: HeroCardProps) {
    if (!show) return null;

    // Empty state variant
    if (isEmpty) {
        return (
            <div className="relative flex items-center gap-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(244,114,182,0.15)] border border-pink-200/60 ring-1 ring-white/80 p-5 overflow-hidden">
                {/* Corner decoration */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-linear-to-br from-gray-200/30 to-pink-200/10 rounded-full blur-xl pointer-events-none" />

                <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-gray-300 to-gray-400 blur-md opacity-30" />
                    <div className="relative w-14 h-14 rounded-2xl bg-linear-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg shadow-gray-200/50">
                        <Inbox className="w-7 h-7 text-white" />
                    </div>
                </div>

                <div className="relative flex-1 min-w-0">
                    <h3 className="font-bold text-gray-500">
                        {emptyTitle ?? title}
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5 truncate">
                        {emptyDescription ??
                            "ยังไม่มีข้อมูล กรุณานำเข้าข้อมูลนักเรียน"}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <Link
            href={href}
            className="relative flex items-center gap-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(244,114,182,0.15)] border border-pink-200 ring-1 ring-white/80 p-5 group hover:shadow-[0_8px_24px_-4px_rgba(244,114,182,0.25),0_4px_12px_-2px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-pink-300 hover:ring-pink-100 transition-all duration-300 overflow-hidden"
        >
            {/* Corner decoration */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-linear-to-br from-rose-200/30 to-pink-300/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
            {/* Accent bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-400 via-pink-400 to-rose-300 opacity-0 group-hover:opacity-60 transition-opacity duration-300" />

            <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                <div className="relative w-14 h-14 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-200/50 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                    <Icon className="w-7 h-7 text-white" />
                </div>
            </div>

            <div className="relative flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-gray-800 group-hover:text-transparent group-hover:bg-linear-to-r group-hover:from-rose-500 group-hover:to-pink-600 group-hover:bg-clip-text transition-colors duration-300">
                        {title}
                    </h3>
                    {badge ? (
                        <span className="px-2.5 py-0.5 text-xs font-bold bg-linear-to-r from-rose-100 to-pink-100 text-pink-600 rounded-full ring-1 ring-pink-200/50">
                            {badge}
                        </span>
                    ) : null}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 group-hover:text-gray-600 transition-colors truncate">
                    {description}
                </p>
            </div>

            {/* Arrow */}
            <div className="relative opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 shrink-0">
                <ChevronRight className="w-5 h-5 text-pink-400" />
            </div>
        </Link>
    );
}
