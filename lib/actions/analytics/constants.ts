// Analytics configuration constants — derived from shared risk-level config

import { RISK_LEVEL_CONFIG as SHARED_CONFIG } from "@/lib/constants/risk-levels";

export const RISK_LEVEL_CONFIG = Object.fromEntries(
    Object.entries(SHARED_CONFIG).map(([level, config]) => [
        level,
        {
            label: config.label,
            color: config.hexColor,
            referToNurse: config.referToNurse,
        },
    ]),
) as Record<
    keyof typeof SHARED_CONFIG,
    { label: string; color: string; referToNurse: boolean }
>;

export type RiskLevel = keyof typeof RISK_LEVEL_CONFIG;
