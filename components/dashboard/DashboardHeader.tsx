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
}: DashboardHeaderProps) {
    return (
        <div className="relative bg-white rounded-[2.5rem] p-5 sm:p-7 mb-6 overflow-hidden border-[3px] border-[#0BD0D9] shadow-[0_8px_24px_-4px_rgba(11,208,217,0.15)] flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start group">
            {/* Left Avatar (Big image) */}
            <div className="shrink-0 relative w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] rounded-4xl bg-[#FDE24F] flex items-center justify-center overflow-hidden shadow-inner flex-none">
                <Image
                    src="/image/dashboard/teacherprofile.png"
                    alt="Teacher Avatar"
                    width={160}
                    height={160}
                    className="object-contain w-full h-full p-2 sm:p-3 drop-shadow-md"
                    priority
                />
            </div>

            {/* Right Content */}
            <div className="flex-1 flex flex-col w-full text-center sm:text-left pt-2">
                {/* Titles */}
                <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-[28px] font-extrabold pb-1">
                        <span className="text-gray-900">สวัสดี </span>
                        <span className="text-[#0BD0D9]">
                            ชั้นเป็นครูนางฟ้า
                        </span>
                    </h1>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-0.5">
                        ครู{teacherName.replace(/^ครู/, "")}
                    </h2>
                    <p className="text-base sm:text-lg font-bold text-gray-800 flex flex-col sm:flex-row items-center sm:items-start sm:gap-4 mt-1">
                        <span>{schoolName}</span>
                        {subtitle && (
                            <span className="text-[#0BD0D9]">{subtitle}</span>
                        )}
                    </p>
                </div>

                {extra && <div className="mt-2">{extra}</div>}

                {/* Gray Separator Line */}
                <hr className="border-t-2 border-gray-200/80 my-4 sm:my-5 w-full" />

                {/* Badges / Stats */}
                {stats && stats.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                        {stats.map((stat) => {
                            // Assign distinct colors based on label if generic colors are sent
                            let assignedColor = "blue";
                            if (
                                stat.label === "บทบาท" ||
                                stat.color === "green"
                            )
                                assignedColor = "yellow";
                            if (
                                stat.label === "จำนวนนักเรียน" ||
                                stat.color === "emerald"
                            )
                                assignedColor = "emerald";
                            if (stat.color === "blue") assignedColor = "blue";

                            const style = getColorStyle(assignedColor);
                            const Icon = stat.icon;

                            return (
                                <div
                                    key={stat.label}
                                    className={`flex flex-col items-center justify-center min-w-[140px] px-4 py-2.5 rounded-2xl ${style.bg} ${style.border} border-b-[3px] border-r-2 ${style.shadow} transition-transform hover:scale-105 active:scale-95`}
                                >
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <Icon className="w-3.5 h-3.5 text-gray-900 stroke-[2.5]" />
                                        <span className="text-[11px] font-bold text-gray-800 leading-none">
                                            {stat.label}
                                        </span>
                                    </div>
                                    <span className="text-sm font-extrabold text-gray-900 tracking-tight leading-tight">
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
