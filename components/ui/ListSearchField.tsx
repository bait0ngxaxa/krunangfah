"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ListSearchFieldProps {
    value: string;
    placeholder: string;
    label: string;
    resultSummary: string;
    onChange: (value: string) => void;
    borderClassName?: string;
}

const MAX_SEARCH_LENGTH = 100;

export function ListSearchField({
    value,
    placeholder,
    label,
    resultSummary,
    onChange,
    borderClassName = "border-gray-200",
}: ListSearchFieldProps): ReactNode {
    return (
        <label className="relative block">
            <span className="sr-only">{label}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
            <input
                type="search"
                value={value}
                maxLength={MAX_SEARCH_LENGTH}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className={cn(
                    "w-full rounded-xl border bg-white py-2.5 pl-9 pr-3 text-sm font-medium text-gray-900 outline-none transition-base placeholder:text-gray-500 hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100",
                    borderClassName,
                )}
            />
            <span className="sr-only" role="status" aria-live="polite">
                {resultSummary}
            </span>
        </label>
    );
}
