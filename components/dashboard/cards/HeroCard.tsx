import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface HeroCardProps {
    href: string;
    icon: LucideIcon;
    title: string;
    badge?: string | ReactNode;
    description: string;
    show?: boolean;
    isEmpty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    imageSrc?: string;
    theme?: "emerald" | "teal";
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
    imageSrc,
    theme = "teal",
}: HeroCardProps) {
    if (!show) return null;

    if (isEmpty) {
        return (
            <div className="relative flex items-center gap-4 bg-white/90 backdrop-blur-md rounded-4xl shadow-sm border border-gray-200 p-5 overflow-hidden">
                <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-inner">
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

    const isEmerald = theme === "emerald";
    const colors = {
        border: isEmerald ? "border-[#6EE7B7]" : "border-[#0BD0D9]",
        iconBg: isEmerald ? "bg-[#34D399]" : "bg-[#0BD0D9]",
        iconColor: "text-white",
        badgeBg: isEmerald ? "bg-[#A7F3D0]" : "bg-[#A7F3D0]", // Emerald badge for emerald theme
        titleHover: isEmerald
            ? "group-hover:text-emerald-500"
            : "group-hover:text-[#09B8C0]",
    };

    return (
        <Link
            href={href}
            className={`relative bg-white rounded-4xl border-2 ${colors.border} shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-5 sm:p-6 flex items-stretch min-h-[140px] sm:min-h-[160px] group hover:-translate-y-1 transition-all duration-300 w-full`}
        >
            {/* Left Image Spacer */}
            {imageSrc && (
                <div className="w-[80px] sm:w-[100px] shrink-0 relative">
                    <Image
                        src={imageSrc}
                        alt=""
                        width={160}
                        height={180}
                        className="absolute -bottom-2 -left-2 sm:-left-4 w-[120px] sm:w-[150px] max-w-none object-contain origin-bottom z-10 drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                    />
                </div>
            )}

            {/* Right Content */}
            <div
                className={`flex-1 flex flex-col sm:flex-row sm:items-center justify-between relative z-0 ${!imageSrc ? "pl-2" : "pl-6 sm:pl-10"} pr-6 sm:pr-24`}
            >
                {/* Main Titles */}
                <div className="flex flex-col justify-center">
                    {!isEmerald && (
                        <div className="mb-2">
                            <div
                                className={`inline-flex p-2.5 rounded-xl ${colors.iconBg} ${colors.iconColor} shadow-md`}
                            >
                                <Icon className="w-6 h-6 stroke-[2.5]" />
                            </div>
                        </div>
                    )}

                    <h3 className="font-extrabold text-gray-900 text-[18px] sm:text-[22px] leading-tight mb-2">
                        {title}
                    </h3>

                    {/* Badge */}
                    {badge && (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#A7F3D0] border border-[#6EE7B7] shadow-sm w-fit mb-2">
                            <Icon className="w-4 h-4 text-emerald-800 stroke-[2.5]" />
                            <span className="text-sm font-extrabold text-emerald-900">
                                {badge}
                            </span>
                        </div>
                    )}

                    {/* Emerald explicitly has description on the right, Teal has it under */}
                    {!isEmerald && description && (
                        <p className="text-[14px] sm:text-[15px] text-gray-400 font-bold leading-tight">
                            {description}
                        </p>
                    )}
                </div>

                {/* Rightmost Description (Emerald Theme) */}
                {isEmerald && description && (
                    <div className="hidden sm:flex items-center justify-end text-right">
                        <p className="text-[13px] text-gray-400 font-bold max-w-[120px] leading-snug mr-2">
                            {description}
                        </p>
                    </div>
                )}
            </div>

            {/* Bottom/Center Right Circle */}
            <div
                className={`absolute ${isEmerald ? "top-1/2 -translate-y-1/2 right-5" : "bottom-5 right-5"} w-7 h-7 sm:w-9 sm:h-9 rounded-full ${colors.iconBg} ${colors.iconColor} flex items-center justify-center shadow-lg group-hover:brightness-95 transition-all`}
            >
                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
            </div>
        </Link>
    );
}
