import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type EmptyStateVariant = "neutral" | "emerald";

interface EmptyStateProps {
    icon: LucideIcon;
    title: ReactNode;
    description?: ReactNode;
    className?: string;
    variant?: EmptyStateVariant;
}

function getVariantClass(variant: EmptyStateVariant): string {
    if (variant === "emerald") {
        return "bg-emerald-50/50 border-emerald-200";
    }
    return "bg-gray-50/50 border-gray-200";
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    className,
    variant = "neutral",
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "text-center rounded-xl border-2 border-dashed",
                getVariantClass(variant),
                className,
            )}
        >
            <Icon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-bold">{title}</p>
            {description && (
                <p className="text-gray-400 text-sm mt-1 font-medium">
                    {description}
                </p>
            )}
        </div>
    );
}
