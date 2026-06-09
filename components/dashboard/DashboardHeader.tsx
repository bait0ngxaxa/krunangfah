import Image from "next/image";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface StatItem {
    icon: LucideIcon;
    label: string;
    value: string;
    unit?: string;
    color?: string;
}

interface DashboardHeaderProps {
    teacherName: string;
    schoolName: string;
    subtitle?: string;
    extra?: ReactNode;
    stats?: StatItem[];
    variant?: "teacher" | "system_admin";
}

interface ColorStyle {
    bg: string;
    shadow: string;
    border: string;
}

const COLOR_MAP = {
    yellow: {
        bg: "bg-linear-to-b from-[#FCE954] to-[#F1C517]",
        shadow: "shadow-[0_4px_8px_rgba(241,197,23,0.3)]",
        border: "border-[#DFB511]",
    },
    emerald: {
        bg: "bg-linear-to-b from-[#A7F3D0] to-[#6EE7B7]",
        shadow: "shadow-[0_4px_8px_rgba(110,231,183,0.3)]",
        border: "border-[#34D399]",
    },
    green: {
        bg: "bg-linear-to-b from-[#A7F3D0] to-[#6EE7B7]",
        shadow: "shadow-[0_4px_8px_rgba(110,231,183,0.3)]",
        border: "border-[#34D399]",
    },
    blue: {
        bg: "bg-linear-to-b from-[#BFDBFE] to-[#93C5FD]",
        shadow: "shadow-[0_4px_8px_rgba(147,197,253,0.3)]",
        border: "border-[#60A5FA]",
    },
    pink: {
        bg: "bg-linear-to-b from-[#FBCFE8] to-[#F9A8D4]",
        shadow: "shadow-[0_4px_8px_rgba(249,168,212,0.3)]",
        border: "border-[#F472B6]",
    },
    purple: {
        bg: "bg-linear-to-b from-[#DDD6FE] to-[#C4B5FD]",
        shadow: "shadow-[0_4px_8px_rgba(196,181,253,0.3)]",
        border: "border-[#A78BFA]",
    },
    orange: {
        bg: "bg-linear-to-b from-[#FED7AA] to-[#FDBA74]",
        shadow: "shadow-[0_4px_8px_rgba(251,146,60,0.25)]",
        border: "border-[#FB923C]",
    },
} as const;

function getColorStyle(color: string): ColorStyle {
    switch (color) {
        case "yellow":
            return COLOR_MAP.yellow;
        case "emerald":
            return COLOR_MAP.emerald;
        case "green":
            return COLOR_MAP.green;
        case "blue":
            return COLOR_MAP.blue;
        case "pink":
            return COLOR_MAP.pink;
        case "purple":
            return COLOR_MAP.purple;
        case "orange":
            return COLOR_MAP.orange;
        default:
            return COLOR_MAP.emerald;
    }
}

export function DashboardHeader({
    teacherName,
    schoolName,
    subtitle,
    extra,
    stats,
    variant = "teacher",
}: DashboardHeaderProps) {
    const isSystemAdmin = variant === "system_admin";
    const titlePrefix = isSystemAdmin ? "สวัสดี " : "สวัสดี ";
    const titleHighlight = isSystemAdmin
        ? "ผู้ดูแลระบบครูนางฟ้า"
        : "ชั้นเป็นครูนางฟ้า";
    const displayName = isSystemAdmin
        ? teacherName
        : `ครู${teacherName.replace(/^ครู/, "")}`;

    return (
        <div className="relative mb-6 flex flex-col items-center gap-6 overflow-hidden rounded-3xl border-2 border-[var(--brand-primary)] bg-white p-5 shadow-[0_8px_24px_-4px_rgba(11,208,217,0.15)] sm:flex-row sm:items-start sm:gap-8 sm:p-7">
            {/* Left Avatar (Big image) */}
            <div className="relative flex h-[120px] w-[120px] shrink-0 flex-none items-center justify-center overflow-hidden rounded-3xl bg-[#FDE24F] shadow-inner sm:h-[160px] sm:w-[160px]">
                <Image
                    src="/image/dashboard/teacherprofile.png"
                    alt="รูปโปรไฟล์ครู"
                    width={160}
                    height={160}
                    sizes="(min-width: 640px) 160px, 120px"
                    className="h-full w-full object-contain p-2 drop-shadow-md sm:p-3"
                    priority
                />
            </div>

            {/* Right Content */}
            <div className="flex w-full min-w-0 flex-1 flex-col pt-2 text-center sm:text-left">
                {/* Titles */}
                <div className="min-w-0">
                    <h1 className="break-words pb-1 text-2xl font-extrabold leading-tight sm:text-3xl lg:text-[28px]">
                        <span className="text-gray-900">{titlePrefix}</span>
                        <span className="text-[var(--brand-primary)]">
                            {titleHighlight}
                        </span>
                    </h1>
                    <h2 className="mb-0.5 break-words text-lg font-bold leading-tight text-gray-800 sm:text-xl lg:text-2xl">
                        {displayName}
                    </h2>
                    <p className="mt-1 flex min-w-0 flex-col items-center text-base font-bold text-gray-800 sm:flex-row sm:items-start sm:gap-4 sm:text-lg">
                        <span className="min-w-0 break-words">{schoolName}</span>
                        {subtitle && (
                            <span className="min-w-0 break-words text-[var(--brand-primary)]">
                                {subtitle}
                            </span>
                        )}
                    </p>
                </div>

                {extra && <div className="mt-2">{extra}</div>}

                {/* Gray Separator Line */}
                <hr className="border-t-2 border-gray-200/80 my-4 sm:my-5 w-full" />

                {/* Badges / Stats */}
                {stats && stats.length > 0 && (
                    <div className="flex flex-wrap items-stretch justify-center gap-3 sm:justify-start">
                        {stats.map((stat) => {
                            const assignedColor =
                                stat.color ??
                                (stat.label === "บทบาท" ? "orange" : "blue");

                            const style = getColorStyle(assignedColor);
                            const Icon = stat.icon;

                            return (
                                <div
                                    key={stat.label}
                                    className={`flex w-full min-w-0 flex-col items-center justify-center rounded-2xl border-b-[3px] border-r-2 px-4 py-2.5 sm:w-auto sm:min-w-[140px] ${style.bg} ${style.border} ${style.shadow}`}
                                >
                                    <div className="mb-0.5 flex min-w-0 items-center gap-1.5">
                                        <Icon
                                            className="h-3.5 w-3.5 shrink-0 text-gray-900 stroke-[2.5]"
                                            aria-hidden="true"
                                        />
                                        <span className="min-w-0 break-words text-center text-[11px] font-bold leading-tight text-gray-800">
                                            {stat.label}
                                        </span>
                                    </div>
                                    <span className="min-w-0 break-words text-center text-sm font-extrabold leading-tight tracking-tight text-gray-900">
                                        {stat.value}
                                        {stat.unit && ` ${stat.unit}`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
