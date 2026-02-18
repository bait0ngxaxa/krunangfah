import type { RiskLevel } from "@/lib/utils/phq-scoring";

export interface RiskLevelStyle {
    label: string;
    emoji: string;
    headerGradient: string;
    headerTextColor: string;
    cardBg: string;
    cardBorder: string;
    cardRing: string;
    badgeBg: string;
    badgeText: string;
    countBg: string;
    countText: string;
    hoverBg: string;
    hoverText: string;
    btnBase: string;
    btnHover: string;
    fadeTo: string;
    rowBorder: string;
}

export const RISK_LEVEL_CONFIG: Record<RiskLevel, RiskLevelStyle> = {
    red: {
        label: "เสี่ยงสูงมาก",
        emoji: "🔴",
        headerGradient: "bg-gradient-to-r from-red-500 via-rose-500 to-red-600",
        headerTextColor: "text-white",
        cardBg: "bg-gradient-to-b from-red-50/80 to-white",
        cardBorder: "border-red-200/60",
        cardRing: "ring-red-100/50",
        badgeBg: "bg-red-100",
        badgeText: "text-red-600",
        countBg: "bg-white/30",
        countText: "text-white",
        hoverBg: "hover:bg-red-50/60",
        hoverText: "group-hover:text-red-700",
        btnBase:
            "bg-white text-red-500 border border-red-200 shadow-red-100/50",
        btnHover:
            "hover:bg-red-50 hover:border-red-300 hover:shadow-red-200/60",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-red-100/40",
    },
    orange: {
        label: "เสี่ยงสูง",
        emoji: "🟠",
        headerGradient:
            "bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500",
        headerTextColor: "text-white",
        cardBg: "bg-gradient-to-b from-orange-50/80 to-white",
        cardBorder: "border-orange-200/60",
        cardRing: "ring-orange-100/50",
        badgeBg: "bg-orange-100",
        badgeText: "text-orange-600",
        countBg: "bg-white/30",
        countText: "text-white",
        hoverBg: "hover:bg-orange-50/60",
        hoverText: "group-hover:text-orange-700",
        btnBase:
            "bg-white text-orange-500 border border-orange-200 shadow-orange-100/50",
        btnHover:
            "hover:bg-orange-50 hover:border-orange-300 hover:shadow-orange-200/60",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-orange-100/40",
    },
    yellow: {
        label: "เสี่ยงปานกลาง",
        emoji: "🟡",
        headerGradient:
            "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500",
        headerTextColor: "text-amber-900",
        cardBg: "bg-gradient-to-b from-yellow-50/80 to-white",
        cardBorder: "border-yellow-200/60",
        cardRing: "ring-yellow-100/50",
        badgeBg: "bg-yellow-100",
        badgeText: "text-yellow-700",
        countBg: "bg-amber-900/15",
        countText: "text-amber-900",
        hoverBg: "hover:bg-yellow-50/60",
        hoverText: "group-hover:text-amber-700",
        btnBase:
            "bg-white text-amber-600 border border-yellow-200 shadow-yellow-100/50",
        btnHover:
            "hover:bg-yellow-50 hover:border-yellow-300 hover:shadow-yellow-200/60",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-yellow-100/40",
    },
    green: {
        label: "เสี่ยงต่ำ",
        emoji: "🟢",
        headerGradient:
            "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600",
        headerTextColor: "text-white",
        cardBg: "bg-gradient-to-b from-green-50/80 to-white",
        cardBorder: "border-green-200/60",
        cardRing: "ring-green-100/50",
        badgeBg: "bg-green-100",
        badgeText: "text-green-600",
        countBg: "bg-white/30",
        countText: "text-white",
        hoverBg: "hover:bg-green-50/60",
        hoverText: "group-hover:text-green-700",
        btnBase:
            "bg-white text-green-600 border border-green-200 shadow-green-100/50",
        btnHover:
            "hover:bg-green-50 hover:border-green-300 hover:shadow-green-200/60",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-green-100/40",
    },
    blue: {
        label: "ปกติ",
        emoji: "🔵",
        headerGradient:
            "bg-gradient-to-r from-blue-500 via-sky-500 to-blue-600",
        headerTextColor: "text-white",
        cardBg: "bg-gradient-to-b from-blue-50/80 to-white",
        cardBorder: "border-blue-200/60",
        cardRing: "ring-blue-100/50",
        badgeBg: "bg-blue-100",
        badgeText: "text-blue-600",
        countBg: "bg-white/30",
        countText: "text-white",
        hoverBg: "hover:bg-blue-50/60",
        hoverText: "group-hover:text-blue-700",
        btnBase:
            "bg-white text-blue-500 border border-blue-200 shadow-blue-100/50",
        btnHover:
            "hover:bg-blue-50 hover:border-blue-300 hover:shadow-blue-200/60",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-blue-100/40",
    },
};

export function getRiskLevelConfig(level: RiskLevel): RiskLevelStyle {
    switch (level) {
        case "red":    return RISK_LEVEL_CONFIG.red;
        case "orange": return RISK_LEVEL_CONFIG.orange;
        case "yellow": return RISK_LEVEL_CONFIG.yellow;
        case "green":  return RISK_LEVEL_CONFIG.green;
        case "blue":   return RISK_LEVEL_CONFIG.blue;
    }
}
