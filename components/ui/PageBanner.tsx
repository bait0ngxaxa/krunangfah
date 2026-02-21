import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface PageBannerProps {
    title: string;
    subtitle?: ReactNode;
    icon?: LucideIcon;
    imageSrc?: string;
    imageAlt?: string;

    // Theme options
    bgClassName?: string;
    borderClassName?: string;
    bgImage?: string;

    // Actions
    actionNode?: ReactNode;
    showBackButton?: boolean;
    backUrl?: string;
    backLabel?: string;
}

export function PageBanner({
    title,
    subtitle,
    icon: Icon,
    imageSrc,
    imageAlt = "Banner Illustration",
    bgClassName = "bg-emerald-50",
    borderClassName = "border-[#008F5D]",
    bgImage = "/image/login_bg.png",
    actionNode,
    showBackButton = true,
    backUrl = "/dashboard",
    backLabel = "กลับหน้าหลัก",
}: PageBannerProps) {
    return (
        <div
            className={`relative w-full overflow-hidden shadow-md min-h-[260px] sm:min-h-[320px] md:min-h-[360px] border-b-[3px] ${bgClassName} ${borderClassName}`}
        >
            {bgImage && (
                <Image
                    src={bgImage}
                    alt=""
                    fill
                    className="object-cover object-[center_75%]"
                    priority
                />
            )}

            <div className="relative z-20 max-w-7xl mx-auto w-full h-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-start gap-4">
                {/* Content Layer */}
                <div className="text-gray-900 relative z-20">
                    {Icon && (
                        <Icon className="w-10 h-10 sm:w-16 sm:h-16 mb-2 sm:mb-4 text-gray-900 fill-current" />
                    )}
                    <h1 className="text-[28px] sm:text-[42px] font-extrabold mb-2 sm:mb-3 tracking-tight leading-none text-gray-900">
                        {title}
                    </h1>

                    {subtitle && (
                        <div className="font-bold text-sm sm:text-lg leading-snug text-gray-800">
                            {subtitle}
                        </div>
                    )}

                    {actionNode && (
                        <div className="mt-5 sm:mt-8">{actionNode}</div>
                    )}
                </div>

                {/* Top Right Action - Back Button */}
                {showBackButton && (
                    <div className="w-full sm:w-auto flex justify-end sm:justify-start">
                        <Link
                            href={backUrl}
                            className="inline-flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-2.5 bg-[#FFE1ED] border-2 border-[#FFB7D5] text-[#FF5A92] rounded-full font-bold text-xs sm:text-base hover:bg-[#FFD1E3] transition-colors shadow-sm relative z-30"
                        >
                            <ArrowLeft className="w-4 h-4 sm:w-[18px] sm:h-[18px] stroke-3" />
                            {backLabel}
                        </Link>
                    </div>
                )}
            </div>

            {/* Image Layer - Absolute Positioned to Bottom Center */}
            {imageSrc && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[260px] sm:w-[380px] lg:w-[460px] pointer-events-none z-10 flex items-end">
                    <Image
                        src={imageSrc}
                        alt={imageAlt}
                        width={600}
                        height={500}
                        className="w-full h-auto object-contain object-bottom drop-shadow-lg -mb-2"
                        priority
                    />
                </div>
            )}
        </div>
    );
}
