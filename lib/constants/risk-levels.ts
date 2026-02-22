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
        headerGradient: "bg-red-50 border-b border-red-100",
        headerTextColor: "text-red-700",
        cardBg: "bg-white",
        cardBorder: "border-red-200",
        cardRing: "shadow-sm ring-1 ring-red-100/50",
        badgeBg: "bg-red-100",
        badgeText: "text-red-700",
        countBg: "bg-red-100",
        countText: "text-red-700",
        hoverBg: "hover:bg-slate-50/70",
        hoverText: "group-hover:text-slate-900",
        btnBase: "bg-white text-red-600 border border-red-200 shadow-sm",
        btnHover: "hover:bg-red-50 hover:border-red-300",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-slate-100",
    },
    orange: {
        label: "เสี่ยงสูง",
        emoji: "🟠",
        headerGradient: "bg-orange-50 border-b border-orange-100",
        headerTextColor: "text-orange-700",
        cardBg: "bg-white",
        cardBorder: "border-orange-200",
        cardRing: "shadow-sm ring-1 ring-orange-100/50",
        badgeBg: "bg-orange-100",
        badgeText: "text-orange-700",
        countBg: "bg-orange-100",
        countText: "text-orange-700",
        hoverBg: "hover:bg-slate-50/70",
        hoverText: "group-hover:text-slate-900",
        btnBase: "bg-white text-orange-600 border border-orange-200 shadow-sm",
        btnHover: "hover:bg-orange-50 hover:border-orange-300",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-slate-100",
    },
    yellow: {
        label: "เสี่ยงปานกลาง",
        emoji: "🟡",
        headerGradient: "bg-yellow-50 border-b border-yellow-100",
        headerTextColor: "text-yellow-700",
        cardBg: "bg-white",
        cardBorder: "border-yellow-200",
        cardRing: "shadow-sm ring-1 ring-yellow-100/50",
        badgeBg: "bg-yellow-100",
        badgeText: "text-yellow-700",
        countBg: "bg-yellow-100",
        countText: "text-yellow-700",
        hoverBg: "hover:bg-slate-50/70",
        hoverText: "group-hover:text-slate-900",
        btnBase: "bg-white text-yellow-600 border border-yellow-200 shadow-sm",
        btnHover: "hover:bg-yellow-50 hover:border-yellow-300",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-slate-100",
    },
    green: {
        label: "เสี่ยงต่ำ",
        emoji: "🟢",
        headerGradient: "bg-emerald-50 border-b border-emerald-100",
        headerTextColor: "text-emerald-700",
        cardBg: "bg-white",
        cardBorder: "border-emerald-200",
        cardRing: "shadow-sm ring-1 ring-emerald-100/50",
        badgeBg: "bg-emerald-100",
        badgeText: "text-emerald-700",
        countBg: "bg-emerald-100",
        countText: "text-emerald-700",
        hoverBg: "hover:bg-slate-50/70",
        hoverText: "group-hover:text-slate-900",
        btnBase:
            "bg-white text-emerald-600 border border-emerald-200 shadow-sm",
        btnHover: "hover:bg-emerald-50 hover:border-emerald-300",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-slate-100",
    },
    blue: {
        label: "ปกติ",
        emoji: "🔵",
        headerGradient: "bg-blue-50 border-b border-blue-100",
        headerTextColor: "text-blue-700",
        cardBg: "bg-white",
        cardBorder: "border-blue-200",
        cardRing: "shadow-sm ring-1 ring-blue-100/50",
        badgeBg: "bg-blue-100",
        badgeText: "text-blue-700",
        countBg: "bg-blue-100",
        countText: "text-blue-700",
        hoverBg: "hover:bg-slate-50/70",
        hoverText: "group-hover:text-slate-900",
        btnBase: "bg-white text-blue-600 border border-blue-200 shadow-sm",
        btnHover: "hover:bg-blue-50 hover:border-blue-300",
        fadeTo: "from-transparent to-white",
        rowBorder: "border-slate-100",
    },
};

export function getRiskLevelConfig(level: RiskLevel): RiskLevelStyle {
    switch (level) {
        case "red":
            return RISK_LEVEL_CONFIG.red;
        case "orange":
            return RISK_LEVEL_CONFIG.orange;
        case "yellow":
            return RISK_LEVEL_CONFIG.yellow;
        case "green":
            return RISK_LEVEL_CONFIG.green;
        case "blue":
            return RISK_LEVEL_CONFIG.blue;
    }
}
