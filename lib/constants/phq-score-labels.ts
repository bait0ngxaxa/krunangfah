export const PHQA_SCORE_OPTIONS = [
    { value: 0, label: "ไม่มีเลย" },
    { value: 1, label: "มีบางวัน" },
    { value: 2, label: "มีมากกว่า 7 วัน" },
    { value: 3, label: "มีแทบทุกวัน" },
] as const;

export const PHQA_SCORE_LABELS = new Map<string, number>(
    PHQA_SCORE_OPTIONS.flatMap((option) => {
        const aliases = option.value === 0
            ? [option.label, "ไม่มเลย"]
            : [option.label];
        return aliases.map((label) => [label, option.value] as const);
    }),
);
