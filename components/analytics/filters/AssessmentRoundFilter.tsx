"use client";

import { ListChecks } from "lucide-react";
import type { ReactElement } from "react";

interface AssessmentRoundFilterProps {
    availableRounds: number[];
    selectedRound: string;
    onRoundChange: (roundValue: string) => void;
    disabled?: boolean;
}

function getRoundLabel(round: number): string {
    switch (round) {
        case 1:
            return "ครั้งที่ 1 (ต้นเทอม)";
        case 2:
            return "ครั้งที่ 2 (ปลายเทอม)";
        default:
            return `ครั้งที่ ${round}`;
    }
}

export function AssessmentRoundFilter({
    availableRounds,
    selectedRound,
    onRoundChange,
    disabled = false,
}: AssessmentRoundFilterProps): ReactElement | null {
    if (availableRounds.length <= 1) {
        return null;
    }

    return (
        <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/60 to-emerald-50/40 p-4 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)]">
            <div className="pointer-events-none absolute -top-14 -right-14 h-32 w-32 rounded-full bg-emerald-200/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-12 h-36 w-36 rounded-full bg-cyan-200/25 blur-3xl" />

            <div className="relative z-10">
                <div className="rounded-2xl border border-white/80 bg-white/85 p-2.5 text-emerald-600 shadow-md ring-1 ring-slate-900/5">
                    <ListChecks className="w-5 h-5" aria-hidden="true" />
                </div>
            </div>
            <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <label
                    htmlFor="round-filter-analytics"
                    className="text-sm font-bold whitespace-nowrap text-slate-700"
                >
                    ครั้งที่:
                </label>
                <select
                    id="round-filter-analytics"
                    value={selectedRound}
                    disabled={disabled}
                    onChange={(e) => onRoundChange(e.target.value)}
                    className="w-full min-w-0 cursor-pointer truncate rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 font-medium text-slate-600 outline-none transition-base hover:border-cyan-300 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-200 disabled:cursor-wait disabled:opacity-70 sm:flex-1"
                >
                    <option value="all">ทุกครั้ง</option>
                    {availableRounds.map((round) => (
                        <option key={round} value={String(round)}>
                            {getRoundLabel(round)}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
