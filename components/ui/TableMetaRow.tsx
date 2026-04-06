import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface TableMetaRowProps {
    summary: ReactNode;
    controls: ReactNode;
    className?: string;
    borderClassName?: string;
    summaryClassName?: string;
    controlsClassName?: string;
}

export function TableMetaRow({
    summary,
    controls,
    className,
    borderClassName,
    summaryClassName,
    controlsClassName,
}: TableMetaRowProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-between mt-4 pt-3 border-t",
                borderClassName ?? "border-gray-100",
                className,
            )}
        >
            <p className={cn("text-xs text-gray-500", summaryClassName)}>
                {summary}
            </p>
            <div className={cn("flex items-center gap-2", controlsClassName)}>
                {controls}
            </div>
        </div>
    );
}
