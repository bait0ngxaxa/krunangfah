import type { RiskConfigMap } from "./types";
import { RISK_LEVEL_CONFIG } from "@/lib/constants/risk-levels";
import type { RiskLevel } from "@/lib/utils/phq-scoring";

export const MAX_VISIBLE_RESULTS = 6;
export const RESULT_ROW_HEIGHT = 72;
export const MAX_LIST_HEIGHT = MAX_VISIBLE_RESULTS * RESULT_ROW_HEIGHT;

/**
 * Derived from shared RISK_LEVEL_CONFIG for student-search badge display.
 */
export const RISK_CONFIG: RiskConfigMap = Object.fromEntries(
    (
        Object.entries(RISK_LEVEL_CONFIG) as [
            RiskLevel,
            (typeof RISK_LEVEL_CONFIG)[RiskLevel],
        ][]
    ).map(([level, config]) => [
        level,
        {
            label: config.label,
            emoji: config.emoji,
            bgColor: config.bgLight,
            textColor: config.textColorDark,
            borderColor: config.borderMedium,
        },
    ]),
) as RiskConfigMap;
