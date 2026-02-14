import type { RiskConfigMap } from "./types";

export const MAX_VISIBLE_RESULTS = 6;
export const RESULT_ROW_HEIGHT = 72;
export const MAX_LIST_HEIGHT = MAX_VISIBLE_RESULTS * RESULT_ROW_HEIGHT;

export const RISK_CONFIG: RiskConfigMap = {
    blue: {
        label: "ปกติ",
        emoji: "🔵",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
    },
    green: {
        label: "เสี่ยงต่ำ",
        emoji: "🟢",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-200",
    },
    yellow: {
        label: "เสี่ยงปานกลาง",
        emoji: "🟡",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-200",
    },
    orange: {
        label: "เสี่ยงสูง",
        emoji: "🟠",
        bgColor: "bg-orange-50",
        textColor: "text-orange-700",
        borderColor: "border-orange-200",
    },
    red: {
        label: "เสี่ยงสูงมาก",
        emoji: "🔴",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200",
    },
};
