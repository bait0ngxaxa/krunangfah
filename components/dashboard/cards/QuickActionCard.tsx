import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface QuickActionCardProps {
    href: string;
    icon: LucideIcon;
    title: string;
    description: string;
}

export function QuickActionCard({
    href,
    icon: Icon,
    title,
    description,
}: QuickActionCardProps) {
    return (
        <Link
            href={href}
            className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(244,114,182,0.15)] border border-pink-200 ring-1 ring-white/80 p-5 group hover:shadow-[0_8px_24px_-4px_rgba(244,114,182,0.25),0_4px_12px_-2px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-pink-300 hover:ring-pink-100 transition-all duration-300 block overflow-hidden"
        >
            {/* Decorative gradient corner */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-linear-to-br from-rose-200/30 to-pink-300/20 rounded-full blur-xl group-hover:scale-[1.8] transition-transform duration-500 pointer-events-none" />
            {/* Shimmer top line */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
                <div className="p-2.5 rounded-xl bg-linear-to-br from-rose-100 to-pink-100 shadow-inner ring-1 ring-rose-200/50 text-rose-500 w-fit mb-3 group-hover:from-rose-200 group-hover:to-pink-200 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-pink-200/50 transition-all duration-300">
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-800 group-hover:text-transparent group-hover:bg-linear-to-r group-hover:from-rose-500 group-hover:to-pink-600 group-hover:bg-clip-text transition-colors duration-300">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 group-hover:text-gray-600 transition-colors">
                            {description}
                        </p>
                    </div>
                    {/* Arrow indicator */}
                    <div className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        <ChevronRight className="w-5 h-5 text-pink-400" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
