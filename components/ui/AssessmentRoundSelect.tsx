import { ListChecks } from "lucide-react";
import type { ReactElement } from "react";
import { FilterSelect } from "./FilterSelect";

interface AssessmentRoundSelectProps {
    availableRounds: number[];
    selectedRound: string;
    onRoundChange: (roundValue: string) => void;
    disabled?: boolean;
    id?: string;
}

function getRoundLabel(round: number): string {
    if (round === 1) return "ครั้งที่ 1 (ต้นเทอม)";
    if (round === 2) return "ครั้งที่ 2 (ปลายเทอม)";
    return `ครั้งที่ ${round}`;
}

export function AssessmentRoundSelect({
    availableRounds,
    selectedRound,
    onRoundChange,
    disabled = false,
    id = "round-filter",
}: AssessmentRoundSelectProps): ReactElement | null {
    if (availableRounds.length <= 1) return null;

    return (
        <FilterSelect
            icon={ListChecks}
            label="ครั้งที่:"
            id={id}
            value={selectedRound}
            onChange={onRoundChange}
            disabled={disabled}
        >
            <option value="all">ทุกครั้ง</option>
            {availableRounds.map((round) => (
                <option key={round} value={String(round)}>
                    {getRoundLabel(round)}
                </option>
            ))}
        </FilterSelect>
    );
}
