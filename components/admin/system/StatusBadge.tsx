import { cn } from "@/lib/utils/cn";

interface StatusBadgeProps {
    children: string;
    tone?: "neutral" | "success" | "warning" | "danger";
}

export function StatusBadge({
    children,
    tone = "neutral",
}: StatusBadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-bold",
                getToneClass(tone),
            )}
        >
            {children}
        </span>
    );
}

function getToneClass(tone: NonNullable<StatusBadgeProps["tone"]>): string {
    switch (tone) {
        case "success":
            return "border-emerald-200 bg-emerald-50 text-emerald-800";
        case "warning":
            return "border-amber-200 bg-amber-50 text-amber-800";
        case "danger":
            return "border-red-200 bg-red-50 text-red-700";
        case "neutral":
            return "border-gray-200 bg-gray-50 text-gray-700";
    }
}
