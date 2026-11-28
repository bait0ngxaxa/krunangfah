import type { ReactElement } from "react";
import {
    formatResultTermLabel,
    isNotScreenedThisTerm,
} from "@/lib/utils/student-result-term";

interface ResultTermTagsProps {
    result?: {
        assessmentRound?: number;
        academicYear?: { id: string; year: number; semester: number };
    };
    currentAcademicYearId?: string | null;
    /** Only the default (latest result) view flags results from other terms. */
    flagNotScreenedThisTerm: boolean;
}

export function ResultTermTags({
    result,
    currentAcademicYearId,
    flagNotScreenedThisTerm,
}: ResultTermTagsProps): ReactElement | null {
    const label = formatResultTermLabel(result);
    if (!label) return null;
    const showFlag =
        flagNotScreenedThisTerm &&
        isNotScreenedThisTerm(result, currentAcademicYearId);

    return (
        <>
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-400">
                {label}
            </span>
            {showFlag ? (
                <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                    ยังไม่ได้คัดกรองเทอมนี้
                </span>
            ) : null}
        </>
    );
}
