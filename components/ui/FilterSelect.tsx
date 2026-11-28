import type { LucideIcon } from "lucide-react";
import type { ReactElement, ReactNode } from "react";

export type FilterSelectVariant = "card" | "field";

interface FilterSelectProps {
    icon: LucideIcon;
    label: string;
    id: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    variant?: FilterSelectVariant;
    children: ReactNode;
}

export function FilterSelect({
    icon: Icon,
    label,
    id,
    value,
    onChange,
    disabled = false,
    variant = "card",
    children,
}: FilterSelectProps): ReactElement {
    const select = (
        <select
            id={id}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            className={
                variant === "field"
                    ? "h-10 w-full min-w-0 cursor-pointer truncate rounded-xl border border-cyan-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-colors hover:border-cyan-300 focus-visible:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
                    : "w-full min-w-0 cursor-pointer truncate rounded-xl border border-cyan-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-cyan-300 focus-visible:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:shadow-none sm:flex-1"
            }
        >
            {children}
        </select>
    );

    if (variant === "field") {
        return (
            <div className="grid min-w-0 gap-1.5">
                <label
                    htmlFor={id}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600"
                >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-700" aria-hidden="true" />
                    {label}
                </label>
                {select}
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm">
            <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-cyan-100/50 glow-blob-k125" />
            <div className="relative flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label
                    htmlFor={id}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-gray-700"
                >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-cyan-200 bg-white text-cyan-700 shadow-sm">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    {label}
                </label>
                {select}
            </div>
        </div>
    );
}
