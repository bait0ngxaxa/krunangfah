import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface SectionCardProps {
    children: ReactNode;
    className?: string;
}

interface SectionCardHeaderProps {
    icon: LucideIcon;
    title: ReactNode;
    className?: string;
    iconClassName?: string;
    titleClassName?: string;
}

export function SectionCard({ children, className }: SectionCardProps) {
    return (
        <div
            className={cn(
                "bg-white rounded-3xl border-2 border-gray-100 shadow-sm relative overflow-hidden",
                className,
            )}
        >
            {children}
        </div>
    );
}

export function SectionCardHeader({
    icon: Icon,
    title,
    className,
    iconClassName,
    titleClassName,
}: SectionCardHeaderProps) {
    return (
        <h2 className={cn("font-bold mb-4 flex items-center gap-2", className)}>
            <Icon
                className={cn(
                    "w-5 h-5 text-[var(--brand-primary)] stroke-[2.5]",
                    iconClassName,
                )}
            />
            <span className={cn("text-gray-900 font-extrabold", titleClassName)}>
                {title}
            </span>
        </h2>
    );
}
