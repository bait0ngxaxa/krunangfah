import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonVariantOptions {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    className?: string;
}

const BASE_BUTTON_CLASS =
    "inline-flex items-center justify-center gap-2 font-semibold transition-base duration-200 cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-primary)]/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0";

function getVariantClass(variant: ButtonVariant): string {
    switch (variant) {
        case "primary":
            return "text-white border-[var(--btn-primary-border)] bg-linear-to-r from-[var(--btn-primary-from)] to-[var(--btn-primary-to)] shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:from-[var(--btn-primary-from-hover)] hover:to-[var(--btn-primary-to-hover)]";
        case "secondary":
            return "bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] border-[var(--btn-secondary-border)] shadow-sm hover:bg-[var(--btn-secondary-bg-hover)] hover:border-[var(--btn-secondary-border-hover)] hover:text-[var(--btn-secondary-text-hover)] hover:-translate-y-0.5";
        case "ghost":
            return "bg-transparent text-[var(--btn-ghost-text)] border-transparent hover:bg-[var(--btn-ghost-bg-hover)] hover:text-[var(--btn-ghost-text-hover)]";
        case "danger":
            return "bg-[var(--btn-danger-bg)] text-[var(--btn-danger-text)] border-[var(--btn-danger-border)] shadow-sm hover:bg-[var(--btn-danger-bg-hover)] hover:border-[var(--btn-danger-border-hover)] hover:-translate-y-0.5";
    }
}

function getSizeClass(size: ButtonSize): string {
    switch (size) {
        case "sm":
            return "px-3 py-2 text-sm rounded-xl";
        case "md":
            return "px-4 py-2.5 text-sm rounded-xl";
        case "lg":
            return "px-6 py-3 text-base rounded-2xl";
    }
}

export function buttonVariants({
    variant = "secondary",
    size = "md",
    fullWidth = false,
    className,
}: ButtonVariantOptions = {}): string {
    return cn(
        BASE_BUTTON_CLASS,
        getVariantClass(variant),
        getSizeClass(size),
        fullWidth ? "w-full" : "",
        className,
    );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, fullWidth, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={buttonVariants({ variant, size, fullWidth, className })}
                {...props}
            />
        );
    },
);

Button.displayName = "Button";
