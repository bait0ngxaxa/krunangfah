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
            className="group relative flex min-h-[140px] items-stretch rounded-3xl border-2 border-[var(--brand-primary)] bg-white p-4 shadow-[0_4px_12px_rgba(11,208,217,0.1)] motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 sm:p-5"
        >
            {/* Left Image Spacer */}
            {imageSrc && (
                <div className="relative w-[70px] shrink-0 sm:w-[80px]">
                    <Image
                        src={imageSrc}
                        alt=""
                        width={140}
                        height={160}
                        sizes="(min-width: 640px) 110px, 100px"
                        className={`absolute -bottom-1 -left-1 z-10 max-w-none origin-bottom object-contain drop-shadow-md motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105 sm:-left-3 ${
                            imageClassName || "w-[100px] sm:w-[110px]"
                        }`}
                    />
                </div>
            )}

            {/* Right Content */}
            <div
                className={`relative z-0 flex min-w-0 flex-1 flex-col justify-center ${!imageSrc ? "pl-1" : "pl-6 sm:pl-8"} pr-9 sm:pr-10`}
            >
                <div className="mb-2">
                    <div className="inline-flex rounded-xl border-2 border-[var(--brand-primary)] bg-white p-2.5 text-[var(--brand-primary)] shadow-md">
                        <Icon
                            className="h-6 w-6 stroke-[2.5]"
                            aria-hidden="true"
                        />
                    </div>
                </div>

                <h3 className="mb-1 break-words text-base font-extrabold leading-tight text-gray-900 sm:text-[17px]">
                    {title}
                </h3>
                {description && (
                    <p className="break-words text-[13px] font-bold leading-snug text-gray-500 sm:text-sm">
                        {description}
                    </p>
                )}

                {actionButton && (
                    <div className="relative z-20 mt-2.5 flex min-w-0 flex-wrap">
                        {actionButton}
                    </div>
                )}
            </div>

            {/* Bottom Right Circle */}
            <div className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--brand-primary)] bg-white text-[var(--brand-primary)] shadow-lg transition-colors group-hover:border-[var(--brand-primary-hover)] group-hover:text-[var(--brand-primary-hover)] motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:brightness-95 sm:bottom-5 sm:right-5">
                <ChevronDown
                    className="h-4 w-4 stroke-3 sm:h-5 sm:w-5"
                    aria-hidden="true"
                />
            </div>
        </Link>
    );
}
