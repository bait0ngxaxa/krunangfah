import type { RiskLevel } from "@/lib/utils/phq-scoring";

export type Activity = {
    id: string;
    title: string;
    description: string;
    worksheets: string[];
};

export type ColorTheme = {
    gradient: string;
    bg: string;
    text: string;
    lightBg: string;
    textColor: string;
    borderColor: string;
    glowBg: string;
    separatorColor: string;
};

// Activity configuration
export const ACTIVITIES: Activity[] = [
    {
        id: "a1",
        title: "กิจกรรมที่ 1: รู้จักตัวเอง",
        description: "ใบงาน 2 ใบ",
        worksheets: ["/activity/a1/act1-1.jpg", "/activity/a1/act1-2.jpg"],
    },
    {
        id: "a2",
        title: "กิจกรรมที่ 2: ค้นหาคุณค่าที่ฉันมี",
        description: "ใบงาน 2 ใบ",
        worksheets: ["/activity/a2/act2-1.jpg", "/activity/a2/act2-2.jpg"],
    },
    {
        id: "a3",
        title: "กิจกรรมที่ 3: ปรับความคิด ชีวิตเปลี่ยน",
        description: "ใบงาน 2 ใบ",
        worksheets: ["/activity/a3/act3-1.jpg", "/activity/a3/act3-2.jpg"],
    },
    {
        id: "a4",
        title: "กิจกรรมที่ 4: รู้จักตัวกระตุ้น",
        description: "ใบงาน 2 ใบ",
        worksheets: ["/activity/a4/act4-1.jpg", "/activity/a4/act4-2.jpg"],
    },
    {
        id: "a5",
        title: "กิจกรรมที่ 5: ตามติดเพื่อไปต่อ",
        description: "ใบงาน 1 ใบ",
        worksheets: ["/activity/a5/act5.jpg"],
    },
];

// Activity indices per risk level (0-indexed)
export const ACTIVITY_INDICES: Record<string, number[]> = {
    orange: [0, 1, 2, 3, 4], // กิจกรรม 1, 2, 3, 4, 5
    yellow: [0, 1, 2, 4], // กิจกรรม 1, 2, 3, 5
    green: [0, 1, 4], // กิจกรรม 1, 2, 5
};

export const COLOR_CONFIG: Record<RiskLevel, ColorTheme> = {
    orange: {
        gradient: "from-orange-500 to-amber-500",
        bg: "bg-orange-500",
        text: "สีส้ม",
        lightBg: "bg-orange-50",
        textColor: "text-orange-600",
        borderColor: "border-orange-200",
        glowBg: "bg-orange-300",
        separatorColor: "text-orange-300",
    },
    yellow: {
        gradient: "from-yellow-400 to-amber-400",
        bg: "bg-yellow-400",
        text: "สีเหลือง",
        lightBg: "bg-yellow-50",
        textColor: "text-yellow-600",
        borderColor: "border-yellow-200",
        glowBg: "bg-yellow-300",
        separatorColor: "text-yellow-300",
    },
    green: {
        gradient: "from-green-500 to-emerald-500",
        bg: "bg-green-500",
        text: "สีเขียว",
        lightBg: "bg-green-50",
        textColor: "text-green-600",
        borderColor: "border-green-200",
        glowBg: "bg-green-300",
        separatorColor: "text-green-300",
    },
    red: {
        gradient: "from-red-500 to-rose-500",
        bg: "bg-red-500",
        text: "สีแดง",
        lightBg: "bg-red-50",
        textColor: "text-red-600",
        borderColor: "border-red-200",
        glowBg: "bg-red-300",
        separatorColor: "text-red-300",
    },
    blue: {
        gradient: "from-blue-500 to-cyan-500",
        bg: "bg-blue-500",
        text: "สีน้ำเงิน",
        lightBg: "bg-blue-50",
        textColor: "text-blue-600",
        borderColor: "border-blue-200",
        glowBg: "bg-blue-300",
        separatorColor: "text-blue-300",
    },
};

export function getColorConfig(level: RiskLevel): ColorTheme {
    switch (level) {
        case "red":    return COLOR_CONFIG.red;
        case "orange": return COLOR_CONFIG.orange;
        case "yellow": return COLOR_CONFIG.yellow;
        case "green":  return COLOR_CONFIG.green;
        case "blue":   return COLOR_CONFIG.blue;
    }
}

export function getActivities(level: RiskLevel): Activity[] {
    switch (level) {
        case "orange": return [ACTIVITIES[0], ACTIVITIES[1], ACTIVITIES[2], ACTIVITIES[3], ACTIVITIES[4]];
        case "yellow": return [ACTIVITIES[0], ACTIVITIES[1], ACTIVITIES[2], ACTIVITIES[4]];
        case "green":  return [ACTIVITIES[0], ACTIVITIES[1], ACTIVITIES[4]];
        case "red":
        case "blue":   return [];
    }
}
