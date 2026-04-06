import {
    AlertCircle,
    CheckCircle2,
    Clock,
    type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type StatusBadgeTone =
    | "pending"
    | "used"
    | "accepted"
    | "expired";

interface BadgeStyle {
    className: string;
    icon: LucideIcon;
}

function getStatusStyle(tone: StatusBadgeTone): BadgeStyle {
    switch (tone) {
        case "pending":
            return {
                className: "bg-green-100 text-green-700",
                icon: Clock,
            };
        case "used":
        case "accepted":
            return {
                className: "bg-gray-100 text-gray-600",
                icon: CheckCircle2,
            };
        case "expired":
            return {
                className: "bg-red-100 text-red-600",
                icon: AlertCircle,
            };
    }
}

interface StatusBadgeProps {
    tone: StatusBadgeTone;
    label: string;
    className?: string;
}

export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
    const style = getStatusStyle(tone);
    const Icon = style.icon;

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                style.className,
                className,
            )}
        >
            <Icon className="w-3 h-3" />
            {label}
        </span>
    );
}
