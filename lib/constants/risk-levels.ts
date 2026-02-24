import type { RiskLevel } from "@/lib/utils/phq-scoring";

export interface RiskLevelStyle {
    // ── Labels ──
    label: string;
    emoji: string;

    // ── Raw hex color (for charts / canvas) ──
    hexColor: string;

    // ── Tailwind: backgrounds ──
    bgSolid: string; // e.g. "bg-red-500"
    bgLight: string; // e.g. "bg-red-50"
    bgMedium: string; // e.g. "bg-red-100"

    // ── Tailwind: text ──
    textColor: string; // e.g. "text-red-600"
    textColorDark: string; // e.g. "text-red-700"

    // ── Tailwind: borders ──
    borderLight: string; // e.g. "border-red-100"
    borderMedium: string; // e.g. "border-red-200"
    borderFocus: string; // e.g. "focus:border-red-500"

    // ── Tailwind: rings ──
    ringColor: string; // e.g. "ring-red-100"
    ringFocus: string; // e.g. "focus:ring-red-300"

    // ── Tailwind: gradient ──
    gradient: string; // e.g. "from-red-500 to-rose-500"

    // ── Tailwind: glow / separator ──
    glowBg: string; // e.g. "bg-red-200"
    separatorColor: string; // e.g. "text-red-300"

    // ── Tailwind: buttons ──
    buttonBg: string; // e.g. "bg-red-600"
    buttonHover: string; // e.g. "hover:bg-red-200"
    buttonRing: string; // e.g. "ring-red-300"

    // ── Tailwind: upload section ──
    uploadButtonBg: string; // e.g. "bg-red-500"
    uploadButtonHover: string; // e.g. "hover:bg-red-600"
    uploadCompleteBg: string; // e.g. "bg-red-500"

    // ── Progress indicator: active circle ──
    circleActive: string; // e.g. "border-red-500 text-red-600 ring-red-100"

    // ── Cards (students page) ──
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

    // ── Analytics ──
    referToNurse: boolean;
}

export const RISK_LEVEL_CONFIG: Record<RiskLevel, RiskLevelStyle> = {
    red: {
        label: "เสี่ยงสูงมาก",
        emoji: "🔴",
        hexColor: "#EF4444",

        bgSolid: "bg-red-500",
        bgLight: "bg-red-50",
        bgMedium: "bg-red-100",

        textColor: "text-red-600",
        textColorDark: "text-red-700",

        borderLight: "border-red-100",
        borderMedium: "border-red-200",
        borderFocus: "focus:border-red-500",

        ringColor: "ring-red-100",
        ringFocus: "focus:ring-red-300",

        gradient: "from-red-500 to-rose-500",
        glowBg: "bg-red-200",
        separatorColor: "text-red-300",

        buttonBg: "bg-red-600",
        buttonHover: "hover:bg-red-200",
        buttonRing: "ring-red-300",

        uploadButtonBg: "bg-red-500",
        uploadButtonHover: "hover:bg-red-600",
        uploadCompleteBg: "bg-red-500",

        circleActive: "border-red-500 text-red-600 ring-red-100",

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

        referToNurse: true,
    },
    orange: {
        label: "เสี่ยงสูง",
        emoji: "🟠",
        hexColor: "#F97316",

        bgSolid: "bg-orange-500",
        bgLight: "bg-orange-50",
        bgMedium: "bg-orange-100",

        textColor: "text-orange-600",
        textColorDark: "text-orange-700",

        borderLight: "border-orange-100",
        borderMedium: "border-orange-200",
        borderFocus: "focus:border-orange-500",

        ringColor: "ring-orange-100",
        ringFocus: "focus:ring-orange-300",

        gradient: "from-orange-500 to-amber-500",
        glowBg: "bg-orange-200",
        separatorColor: "text-orange-300",

        buttonBg: "bg-orange-600",
        buttonHover: "hover:bg-orange-200",
        buttonRing: "ring-orange-300",

        uploadButtonBg: "bg-orange-500",
        uploadButtonHover: "hover:bg-orange-600",
        uploadCompleteBg: "bg-orange-500",

        circleActive: "border-orange-500 text-orange-600 ring-orange-100",

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

        referToNurse: true,
    },
    yellow: {
        label: "เสี่ยงปานกลาง",
        emoji: "🟡",
        hexColor: "#EAB308",

        bgSolid: "bg-yellow-500",
        bgLight: "bg-yellow-50",
        bgMedium: "bg-yellow-100",

        textColor: "text-yellow-600",
        textColorDark: "text-yellow-700",

        borderLight: "border-yellow-100",
        borderMedium: "border-yellow-200",
        borderFocus: "focus:border-yellow-500",

        ringColor: "ring-yellow-100",
        ringFocus: "focus:ring-yellow-300",

        gradient: "from-yellow-400 to-amber-400",
        glowBg: "bg-yellow-200",
        separatorColor: "text-yellow-300",

        buttonBg: "bg-yellow-600",
        buttonHover: "hover:bg-yellow-200",
        buttonRing: "ring-yellow-300",

        uploadButtonBg: "bg-yellow-500",
        uploadButtonHover: "hover:bg-yellow-600",
        uploadCompleteBg: "bg-yellow-500",

        circleActive: "border-yellow-400 text-yellow-600 ring-yellow-100",

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

        referToNurse: true,
    },
    green: {
        label: "เสี่ยงต่ำ",
        emoji: "🟢",
        hexColor: "#22C55E",

        bgSolid: "bg-green-500",
        bgLight: "bg-green-50",
        bgMedium: "bg-green-100",

        textColor: "text-green-600",
        textColorDark: "text-green-700",

        borderLight: "border-green-100",
        borderMedium: "border-green-200",
        borderFocus: "focus:border-green-500",

        ringColor: "ring-green-100",
        ringFocus: "focus:ring-green-300",

        gradient: "from-green-500 to-emerald-500",
        glowBg: "bg-green-200",
        separatorColor: "text-green-300",

        buttonBg: "bg-green-600",
        buttonHover: "hover:bg-green-200",
        buttonRing: "ring-green-300",

        uploadButtonBg: "bg-green-500",
        uploadButtonHover: "hover:bg-green-600",
        uploadCompleteBg: "bg-green-500",

        circleActive: "border-green-500 text-green-600 ring-green-100",

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

        referToNurse: false,
    },
    blue: {
        label: "ปกติ",
        emoji: "🔵",
        hexColor: "#3B82F6",

        bgSolid: "bg-blue-500",
        bgLight: "bg-blue-50",
        bgMedium: "bg-blue-100",

        textColor: "text-blue-600",
        textColorDark: "text-blue-700",

        borderLight: "border-blue-100",
        borderMedium: "border-blue-200",
        borderFocus: "focus:border-blue-500",

        ringColor: "ring-blue-100",
        ringFocus: "focus:ring-blue-300",

        gradient: "from-blue-500 to-indigo-500",
        glowBg: "bg-blue-200",
        separatorColor: "text-blue-300",

        buttonBg: "bg-blue-600",
        buttonHover: "hover:bg-blue-200",
        buttonRing: "ring-blue-300",

        uploadButtonBg: "bg-blue-500",
        uploadButtonHover: "hover:bg-blue-600",
        uploadCompleteBg: "bg-blue-500",

        circleActive: "border-blue-500 text-blue-600 ring-blue-100",

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

        referToNurse: false,
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
