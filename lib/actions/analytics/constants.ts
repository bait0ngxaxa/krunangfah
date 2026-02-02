// Analytics configuration constants

export const RISK_LEVEL_CONFIG = {
    blue: {
        label: "สีฟ้า (ปกติ)",
        color: "#3B82F6",
        referToNurse: false,
    },
    green: {
        label: "สีเขียว (เสี่ยงเล็กน้อย)",
        color: "#10B981",
        referToNurse: false,
    },
    yellow: {
        label: "สีเหลือง (มีปัญหา)",
        color: "#FCD34D",
        referToNurse: true,
    },
    orange: {
        label: "สีส้ม (เสี่ยงรุนแรง)",
        color: "#F97316",
        referToNurse: true,
    },
    red: {
        label: "สีแดง (รุนแรง)",
        color: "#EF4444",
        referToNurse: true,
    },
} as const;

export type RiskLevel = keyof typeof RISK_LEVEL_CONFIG;
