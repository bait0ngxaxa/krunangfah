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
            <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl border border-gray-200 bg-white/90 p-5 shadow-sm backdrop-blur-md">
                <div className="relative shrink-0">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-linear-to-br from-gray-100 to-gray-200 shadow-inner">
                        <Inbox
                            className="h-7 w-7 text-gray-400"
                            aria-hidden="true"
                        />
                    </div>
                </div>
                <div className="relative min-w-0 flex-1">
                    <h3 className="break-words font-bold text-gray-600">
                        {emptyTitle ?? title}
                    </h3>
                    <p className="mt-0.5 break-words text-sm leading-5 text-gray-500">
                        {emptyDescription ??
                            "ยังไม่มีข้อมูล กรุณานำเข้าข้อมูลนักเรียน"}
                    </p>
                </div>
            </div>
        );
    }

    const isEmerald = theme === "emerald";

    const colors = {
        border: isEmerald ? "border-emerald-400" : "border-cyan-400",
        iconBg: isEmerald
            ? "bg-white/95 border border-emerald-200 shadow-sm"
            : "bg-white/95 border border-cyan-200 shadow-sm",
        iconColor: isEmerald ? "text-emerald-600" : "text-cyan-600",
        badgeBg: isEmerald ? "bg-emerald-100" : "bg-cyan-100",
        badgeBorder: isEmerald ? "border-emerald-300" : "border-cyan-300",
        badgeText: isEmerald ? "text-emerald-900" : "text-cyan-900",
        badgeIcon: isEmerald ? "text-emerald-700" : "text-cyan-700",
        titleHover: isEmerald
            ? "group-hover:text-emerald-500"
            : "group-hover:text-cyan-500",
    };

    return (
        <Link
            href={href}
            className={`group relative flex min-h-[140px] w-full items-stretch rounded-3xl border-2 bg-white p-5 shadow-md sm:min-h-[160px] sm:p-6 ${colors.border}
                motion-safe:hover:-translate-y-1
                focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-400 focus-visible:outline-none
                motion-safe:transition-transform motion-safe:duration-300
            `}
        >
            {imageSrc && (
                <div
                    className={`relative shrink-0 sm:w-[100px] ${
                        isEmerald ? "w-[96px]" : "w-[118px]"
                    }`}
                >
                    <Image
                        src={imageSrc}
                        alt=""
                        width={160}
                        height={180}
                        sizes="(min-width: 640px) 150px, 112px"
                        className={`absolute -bottom-1 left-0 z-0 max-w-none origin-bottom object-contain drop-shadow-md sm:-bottom-2 sm:-left-4 sm:w-[150px]
                            motion-safe:group-hover:scale-105 motion-safe:transition-transform motion-safe:duration-300 ${
                                isEmerald ? "w-[88px]" : "w-[112px]"
                            }`}
                    />
                </div>
            )}

            <div
                className={`relative z-10 flex min-w-0 flex-1 flex-col justify-between sm:flex-row sm:items-center ${!imageSrc ? "pl-1 sm:pl-2" : "pl-2 sm:pl-10"} pr-10 sm:pr-24`}
            >
                <div className="flex min-w-0 flex-col justify-center">
                    {!isEmerald && (
                        <div className="mb-2">
                            <div
                                className={`inline-flex rounded-xl p-2.5 ${colors.iconBg} ${colors.iconColor} shadow-md`}
                            >
                                <Icon
                                    className="h-6 w-6 stroke-[2.5]"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    )}

                    <h3 className="mb-2 break-words text-[18px] font-extrabold leading-tight text-gray-900 sm:text-[22px]">
                        {title}
                    </h3>

                    {badge && (
                        <div
                            className={`mb-2 inline-flex max-w-full items-center gap-2 rounded-xl border px-4 py-1.5 shadow-sm ${colors.badgeBg} ${colors.badgeBorder}`}
                        >
                            <Icon
                                className={`h-4 w-4 shrink-0 ${colors.badgeIcon} stroke-[2.5]`}
                                aria-hidden="true"
                            />
                            <span
                                className={`min-w-0 break-words text-sm font-extrabold ${colors.badgeText}`}
                            >
                                {badge}
                            </span>
                        </div>
                    )}

                    {!isEmerald && description && (
                        <p className="break-words text-[14px] font-bold leading-snug text-gray-500 sm:text-[15px]">
                            {description}
                        </p>
                    )}
                </div>

                {isEmerald && description && (
                    <div className="hidden min-w-0 items-center justify-end text-right sm:flex">
                        <p className="mr-2 max-w-[140px] break-words text-[13px] font-bold leading-snug text-gray-500">
                            {description}
                        </p>
                    </div>
                )}
            </div>

            <div
                className={`absolute ${isEmerald ? "right-4 top-1/2 -translate-y-1/2 sm:right-5" : "bottom-5 right-5"} flex h-8 w-8 items-center justify-center rounded-full sm:h-9 sm:w-9 ${colors.iconBg} ${colors.iconColor} shadow-lg
                    motion-safe:group-hover:brightness-95 motion-safe:transition-transform motion-safe:duration-200`}
            >
                <ChevronDown
                    className="h-4 w-4 stroke-3 sm:h-5 sm:w-5"
                    aria-hidden="true"
                />
            </div>
        </Link>
    );
}
