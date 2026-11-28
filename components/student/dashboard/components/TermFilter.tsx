import { CalendarDays, ListOrdered } from "lucide-react";
import type { ReactElement } from "react";

import { FilterSelect } from "@/components/ui/FilterSelect";
import type { AvailableStudentTerm, StudentResultTerm } from "../types";

interface TermFilterProps {
    availableTerms: AvailableStudentTerm[];
    currentAcademicYearId: string | null;
    /** Academic-year id from `year`, or "" for the latest-result view. */
    selectedTermId: string;
    /** "1" / "2", or "" for every round. */
    selectedRound: string;
    selectedTerm: StudentResultTerm | null;
    onTermChange: (termId: string) => void;
    onRoundChange: (round: string) => void;
}

export function formatTermOption(
    term: StudentResultTerm,
    currentAcademicYearId: string | null,
): string {
    const current = term.id === currentAcademicYearId ? " (ปัจจุบัน)" : "";
    return `ปีการศึกษา ${term.year} เทอม ${term.semester}${current}`;
}

/** The selected term stays listed even if it has no visible results. */
function listTerms(
    availableTerms: AvailableStudentTerm[],
    selectedTerm: StudentResultTerm | null,
): AvailableStudentTerm[] {
    if (!selectedTerm || availableTerms.some((t) => t.id === selectedTerm.id)) {
        return availableTerms;
    }
    return [...availableTerms, { ...selectedTerm, rounds: [] }];
}

function listRounds(term: AvailableStudentTerm | undefined, selectedRound: string): number[] {
    const rounds = new Set(term?.rounds ?? []);
    if (selectedRound) rounds.add(Number(selectedRound));
    return [...rounds].sort((a, b) => a - b);
}

export function TermFilter({
    availableTerms,
    currentAcademicYearId,
    selectedTermId,
    selectedRound,
    selectedTerm,
    onTermChange,
    onRoundChange,
}: TermFilterProps): ReactElement | null {
    // Same convention as other filters: hidden with one choice or none. A
    // selected term keeps it visible so the latest-result view is reachable.
    if (availableTerms.length <= 1 && !selectedTermId) return null;
    const terms = listTerms(availableTerms, selectedTerm);
    const activeTerm = terms.find((term) => term.id === selectedTermId);

    return (
        <>
            <FilterSelect
                icon={CalendarDays}
                label="เลือกเทอม:"
                id="student-term-filter"
                value={selectedTermId}
                onChange={onTermChange}
            >
                <option value="">ทั้งหมด (ผลล่าสุด)</option>
                {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                        {formatTermOption(term, currentAcademicYearId)}
                    </option>
                ))}
            </FilterSelect>
            {selectedTermId ? (
                <FilterSelect
                    icon={ListOrdered}
                    label="เลือกรอบ:"
                    id="student-round-filter"
                    value={selectedRound}
                    onChange={onRoundChange}
                >
                    <option value="">ทุกรอบ</option>
                    {listRounds(activeTerm, selectedRound).map((round) => (
                        <option key={round} value={String(round)}>
                            {`รอบ ${round}`}
                        </option>
                    ))}
                </FilterSelect>
            ) : null}
        </>
    );
}
