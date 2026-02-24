/**
 * Activity configuration constants
 */

export interface Activity {
    id: string;
    number: number;
    title: string;
    worksheets: string[];
}

export const ACTIVITIES: Activity[] = [
    {
        id: "a1",
        number: 1,
        title: "กิจกรรมที่ 1: รู้จักตัวเอง",
        worksheets: ["/activity/a1/act1-1.jpg", "/activity/a1/act1-2.jpg"],
    },
    {
        id: "a2",
        number: 2,
        title: "กิจกรรมที่ 2: ค้นหาคุณค่าที่ฉันมี",
        worksheets: ["/activity/a2/act2-1.jpg", "/activity/a2/act2-2.jpg"],
    },
    {
        id: "a3",
        number: 3,
        title: "กิจกรรมที่ 3: ปรับความคิด ชีวิตเปลี่ยน",
        worksheets: ["/activity/a3/act3-1.jpg", "/activity/a3/act3-2.jpg"],
    },
    {
        id: "a4",
        number: 4,
        title: "กิจกรรมที่ 4: รู้จักตัวกระตุ้น",
        worksheets: ["/activity/a4/act4-1.jpg", "/activity/a4/act4-2.jpg"],
    },
    {
        id: "a5",
        number: 5,
        title: "กิจกรรมที่ 5: ตามติดเพื่อไปต่อ",
        worksheets: ["/activity/a5/act5.jpg"],
    },
];

/**
 * Activity indices by risk level
 */
export const ACTIVITY_INDICES: Record<string, number[]> = {
    orange: [1, 2, 3, 4, 5],
    yellow: [1, 2, 3, 5],
    green: [1, 2, 5],
};

/**
 * Activity names by number (short version)
 */
export const ACTIVITY_NAMES: Record<number, string> = {
    1: "รู้จักตัวเอง",
    2: "ค้นหาคุณค่าที่ฉันมี",
    3: "ปรับความคิด ชีวิตเปลี่ยน",
    4: "รู้จักตัวกระตุ้น",
    5: "ตามติดเพื่อไปต่อ",
};

/**
 * Encouragement messages for different problem types
 */
export const ENCOURAGEMENT_MESSAGES = {
    internal: [
        "ใช่เลย",
        "หลายอย่างเกิดจากภายในตัวเด็กเอง",
        "ถ้าเด็กก้าวผ่านจุดนี้ไปได้",
        "เขาจะเติบโตและงอกงามได้",
        "เรามาชวนเขาทำใบงานเหล่านี้กันนะ",
    ],
    external: [
        "เข้าใจเลย",
        "บางปัญหาเราไม่สามารถแก้ไขให้เขาได้",
        "เช่น ปัญหาการเงิน ปัญหาครอบครัว",
        "ชวนเด็กมองสิ่งที่ทำให้เขายิ้มได้ในตอนนี้",
        "เสริมพลังใจให้เขาผ่านกิจกรรมเหล่านี้กันนะ",
    ],
    tips: [
        "ถ้านักเรียนมีปัญหาเรื่องใหญ่แก้ยาก",
        "อยากให้คุณครูให้เขาโฟกัสกับสิ่งนั้นดูก่อน",
        "เพื่อให้มีพลังใจมากขึ้น",
        "คุณครูลองทำตามขั้นตอนที่ระบบแนะนำดูนะ",
    ],
};

export function getEncouragementMessages(
    problemType: "internal" | "external",
): string[] {
    switch (problemType) {
        case "internal":
            return ENCOURAGEMENT_MESSAGES.internal;
        case "external":
            return ENCOURAGEMENT_MESSAGES.external;
    }
}

/**
 * Theme colors by risk level — derived from shared config
 */
import { getRiskLevelConfig } from "@/lib/constants/risk-levels";

export type WorksheetRiskLevel = "orange" | "yellow" | "green";

export function getWorkspaceColorConfig(level: WorksheetRiskLevel) {
    const c = getRiskLevelConfig(level);
    return {
        gradient: c.gradient,
        bg: c.bgSolid,
        bgLight: c.bgLight,
        text:
            level === "orange"
                ? "สีส้ม"
                : level === "yellow"
                  ? "สีเหลือง"
                  : "สีเขียว",
        textColor: c.textColor,
        borderColor: c.borderLight,
        glowBg: c.glowBg,
        separatorColor: c.separatorColor,
    };
}

export function getAssessmentColors(level: WorksheetRiskLevel) {
    const c = getRiskLevelConfig(level);
    return {
        bgLight: c.bgLight,
        border: c.borderMedium,
        borderFocus: c.borderFocus,
        text: c.textColor,
        textDark: c.textColorDark,
        button: c.buttonBg,
        buttonHover: c.buttonHover,
        buttonRing: c.buttonRing,
        ringFocus: c.ringFocus,
    };
}

export function getUploadColors(level: WorksheetRiskLevel) {
    const c = getRiskLevelConfig(level);
    return {
        bgLight: c.bgLight,
        border: c.borderMedium,
        textDark: c.textColorDark,
        button: c.uploadButtonBg,
        buttonHover: c.uploadButtonHover,
        itemBorder: c.borderMedium,
        completeBg: c.uploadCompleteBg,
        completeText: c.textColorDark,
    };
}

export function getWorksheetActivityIndices(
    level: WorksheetRiskLevel,
): number[] {
    switch (level) {
        case "orange":
            return ACTIVITY_INDICES.orange;
        case "yellow":
            return ACTIVITY_INDICES.yellow;
        case "green":
            return ACTIVITY_INDICES.green;
    }
}

export function getActivityName(activityNumber: number): string {
    switch (activityNumber) {
        case 1:
            return ACTIVITY_NAMES[1];
        case 2:
            return ACTIVITY_NAMES[2];
        case 3:
            return ACTIVITY_NAMES[3];
        case 4:
            return ACTIVITY_NAMES[4];
        case 5:
            return ACTIVITY_NAMES[5];
        default:
            return `กิจกรรมที่ ${activityNumber}`;
    }
}

export function getWorksheetNames(activityNumber: number): string[] {
    switch (activityNumber) {
        case 1:
            return WORKSHEET_NAMES[1];
        case 2:
            return WORKSHEET_NAMES[2];
        case 3:
            return WORKSHEET_NAMES[3];
        case 4:
            return WORKSHEET_NAMES[4];
        case 5:
            return WORKSHEET_NAMES[5];
        default:
            return [];
    }
}

/**
 * Download URLs for worksheet PDFs by activity number
 */
export const DOWNLOAD_URLS: Record<number, string[]> = {
    1: ["/download/a1/d1-1.pdf", "/download/a1/d1-2.pdf"],
    2: ["/download/a2/d2-1.pdf", "/download/a2/d2-2.pdf"],
    3: ["/download/a3/d3-1.pdf", "/download/a3/d3-2.pdf"],
    4: ["/download/a4/d4-1.pdf", "/download/a4/d4-2.pdf"],
    5: ["/download/a5/d5.pdf"],
};

export function getDownloadUrls(activityNumber: number): string[] {
    switch (activityNumber) {
        case 1:
            return DOWNLOAD_URLS[1];
        case 2:
            return DOWNLOAD_URLS[2];
        case 3:
            return DOWNLOAD_URLS[3];
        case 4:
            return DOWNLOAD_URLS[4];
        case 5:
            return DOWNLOAD_URLS[5];
        default:
            return [];
    }
}

/**
 * Worksheet names by activity number
 */
export const WORKSHEET_NAMES: Record<number, string[]> = {
    1: ["ฉันชอบตัวเอง", "กราฟวัดลอยจม"],
    2: ["ค้นหาคุณค่าที่ฉันมี", "เสริมสร้างพลังใจ"],
    3: ["ปรับความคิดชีวิตเปลี่ยน", "ตั้งเป้าหมาย"],
    4: ["ตามหาสิ่งกระตุ้น", "แผนการจัดการใจ"],
    5: ["เวลาไม่ไหวจะทำยังไงดี"],
};
