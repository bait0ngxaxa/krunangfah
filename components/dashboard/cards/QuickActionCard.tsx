import Link from "next/link";
import Image from "next/image";
import { ChevronDown, type LucideIcon } from "lucide-react";

interface QuickActionCardProps {
    href: string;
    icon: LucideIcon;
    title: string;
    description: string;
    imageSrc?: string;
    imageClassName?: string;
    actionButton?: React.ReactNode;
}

export function QuickActionCard({
    href,
    icon: Icon,
    title,
    description,
    imageSrc,
    imageClassName,
    actionButton,
}: QuickActionCardProps) {
    return (
        <Link
            href={href}
            className="relative bg-white rounded-4xl border-2 border-[#0BD0D9] shadow-[0_4px_12px_rgba(11,208,217,0.1)] p-4 sm:p-5 flex items-stretch min-h-[140px] group hover:-translate-y-1 transition-all duration-300"
        >
            {/* Left Image Spacer */}
            {imageSrc && (
                <div className="w-[70px] sm:w-[80px] shrink-0 relative">
                    <Image
                        src={imageSrc}
                        alt=""
                        width={140}
                        height={160}
                        className={`absolute -bottom-1 -left-1 sm:-left-3 max-w-none object-contain origin-bottom z-10 drop-shadow-md group-hover:scale-105 transition-transform duration-300 ${
                            imageClassName || "w-[100px] sm:w-[110px]"
                        }`}
                    />
                </div>
            )}

            {/* Right Content */}
            <div
                className={`flex-1 flex flex-col justify-center relative z-0 ${!imageSrc ? "pl-1" : "pl-6 sm:pl-8"} pr-4 sm:pr-8`}
            >
                <div className="mb-2">
                    <div className="inline-flex p-2.5 rounded-xl bg-[#0BD0D9] text-white shadow-md">
                        <Icon className="w-6 h-6 stroke-[2.5]" />
                    </div>
                </div>

                <h3 className="font-extrabold text-gray-900 text-base sm:text-[17px] leading-tight mb-1">
                    {title}
                </h3>
                <p className="text-[13px] sm:text-sm text-gray-400 font-bold leading-tight">
                    {description}
                </p>

                {actionButton && (
                    <div className="mt-2.5 relative z-20">{actionButton}</div>
                )}
            </div>

            {/* Bottom Right Circle */}
            <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0BD0D9] text-white flex items-center justify-center shadow-lg group-hover:bg-[#09B8C0] transition-colors">
                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
            </div>
        </Link>
    );
}
