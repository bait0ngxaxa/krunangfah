"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactElement } from "react";
import { AssessmentRoundSelect } from "@/components/ui/AssessmentRoundSelect";

interface AssessmentRoundFilterProps {
    availableRounds: number[];
    currentRound?: string;
}

export function AssessmentRoundFilter({
    availableRounds,
    currentRound,
}: AssessmentRoundFilterProps): ReactElement | null {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const selectedRoundValue = currentRound ?? "all";
    const [optimisticRound, setOptimisticRound] = useOptimistic(
        selectedRoundValue,
        (_currentValue: string, nextValue: string) => nextValue,
    );

    function handleRoundChange(value: string): void {
        const params = new URLSearchParams(searchParams.toString());

        if (value === "all") {
            params.delete("round");
        } else {
            params.set("round", value);
        }
        params.delete("phqPage");

        const queryString = params.toString();
        startTransition(() => {
            setOptimisticRound(value);
            router.push(queryString ? `${pathname}?${queryString}` : pathname, {
                scroll: false,
            });
        });
    }

    return (
        <AssessmentRoundSelect
            id="round-filter-profile"
            availableRounds={availableRounds}
            selectedRound={optimisticRound}
            onRoundChange={handleRoundChange}
            disabled={isPending}
        />
    );
}
