import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type HeaderVariant = "brand" | "neutral";

interface PageHeaderCardProps {
    icon: LucideIcon;
    title: ReactNode;
    description?: ReactNode;
    variant?: HeaderVariant;
    className?: string;
}

interface VariantStyle {
    container: string;
    accent: string;
    iconWrap: string;
    icon: string;
}

function getVariantStyle(variant: HeaderVariant): VariantStyle {
    if (variant === "brand") {
        return {
            container:
                "relative bg-white rounded-4xl border-2 border-[var(--brand-primary)] shadow-sm p-5 sm:p-6 overflow-hidden group",
            accent: "absolute -top-12 -right-12 w-28 h-28 bg-[var(--brand-primary)]/10 rounded-full blur-xl pointer-events-none",
            iconWrap:
                "w-12 h-12 rounded-2xl bg-white border-2 border-[var(--brand-primary)] flex items-center justify-center shadow-md group-hover:-translate-y-1 transition-transform duration-300",
            icon: "w-6 h-6 text-[var(--brand-primary)] stroke-[2.5]",
        };
    }

    return {
        container:
            "relative bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-5 sm:p-6 overflow-hidden group",
        accent: "",
        iconWrap:
            "w-12 h-12 rounded-2xl bg-white border-2 border-[var(--brand-primary)] flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:rotate-3 transition-base duration-500",
        icon: "w-6 h-6 text-[var(--brand-primary)]",
    };
}

export function PageHeaderCard({
    icon: Icon,
    title,
    description,
    variant = "brand",
    className,
}: PageHeaderCardProps) {
    const style = getVariantStyle(variant);

    return (
        <div className={cn(style.container, className)}>
            {style.accent && <div className={style.accent} />}

            <div className="relative flex items-center gap-4">
                <div className="relative shrink-0">
                    <div className={style.iconWrap}>
                        <Icon className={style.icon} />
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-sm text-gray-500">{description}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
