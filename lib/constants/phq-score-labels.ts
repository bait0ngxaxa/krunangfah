export const PHQA_SCORE_OPTIONS = [
    { value: 0, label: "ไม่มีเลย" },
    { value: 1, label: "มีบางวัน" },
    { value: 2, label: "มีมากกว่า 7 วัน" },
    { value: 3, label: "มีแทบทุกวัน" },
] as const;

export type PhqScore = (typeof PHQA_SCORE_OPTIONS)[number]["value"];

const PHQA_LEGACY_SCORE_ALIASES = [
    // Legacy typo retained because previous imports already accepted it.
    { value: 0, label: "ไม่มเลย" },
] as const satisfies readonly { value: PhqScore; label: string }[];

export function normalizePhqaAnswer(value: string): string {
    return value.trim().replace(/[\s\u00a0]+/g, " ");
}

export const PHQA_SCORE_LABELS: ReadonlyMap<string, PhqScore> = new Map(
    [...PHQA_SCORE_OPTIONS, ...PHQA_LEGACY_SCORE_ALIASES].map((option) => [
        normalizePhqaAnswer(option.label),
        option.value,
    ]),
);

export function parsePhqaScoreLabel(value: string): PhqScore | undefined {
    return PHQA_SCORE_LABELS.get(normalizePhqaAnswer(value));
}

export function isPhqScore(value: unknown): value is PhqScore {
    return value === 0 || value === 1 || value === 2 || value === 3;
}
