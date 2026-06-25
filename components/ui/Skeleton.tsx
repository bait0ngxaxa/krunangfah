import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib/utils/cn";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({
    className,
    ...props
}: SkeletonProps): ReactElement {
    return (
        <div
            aria-hidden="true"
            className={cn("skeleton-shimmer", className)}
            {...props}
        />
    );
}
