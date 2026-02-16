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
 * Theme colors by risk level
 */
export const COLOR_CONFIG: Record<
    string,
    {
        gradient: string;
        bg: string;
        bgLight: string;
        text: string;
        textColor: string;
        borderColor: string;
        glowBg: string;
        separatorColor: string;
    }
> = {
    orange: {
        gradient: "from-orange-500 to-amber-500",
        bg: "bg-orange-500",
        bgLight: "bg-orange-50",
        text: "สีส้ม",
        textColor: "text-orange-600",
        borderColor: "border-orange-100",
        glowBg: "bg-orange-200",
        separatorColor: "text-orange-300",
    },
    yellow: {
        gradient: "from-yellow-400 to-amber-400",
        bg: "bg-yellow-400",
        bgLight: "bg-yellow-50",
        text: "สีเหลือง",
        textColor: "text-yellow-600",
        borderColor: "border-yellow-100",
        glowBg: "bg-yellow-200",
        separatorColor: "text-yellow-300",
    },
    green: {
        gradient: "from-green-500 to-emerald-500",
        bg: "bg-green-500",
        bgLight: "bg-green-50",
        text: "สีเขียว",
        textColor: "text-green-600",
        borderColor: "border-green-100",
        glowBg: "bg-green-200",
        separatorColor: "text-green-300",
    },
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

/**
 * Assessment form colors by risk level
 */
export const ASSESSMENT_COLOR_CONFIG: Record<
    string,
    {
        bgLight: string;
        border: string;
        borderFocus: string;
        text: string;
        textDark: string;
        button: string;
        buttonHover: string;
        buttonRing: string;
        ringFocus: string;
    }
> = {
    orange: {
        bgLight: "bg-orange-50",
        border: "border-orange-200",
        borderFocus: "focus:border-orange-500",
        text: "text-orange-600",
        textDark: "text-orange-700",
        button: "bg-orange-600",
        buttonHover: "hover:bg-orange-200",
        buttonRing: "ring-orange-300",
        ringFocus: "focus:ring-orange-300",
    },
    yellow: {
        bgLight: "bg-yellow-50",
        border: "border-yellow-200",
        borderFocus: "focus:border-yellow-500",
        text: "text-yellow-600",
        textDark: "text-yellow-700",
        button: "bg-yellow-600",
        buttonHover: "hover:bg-yellow-200",
        buttonRing: "ring-yellow-300",
        ringFocus: "focus:ring-yellow-300",
    },
    green: {
        bgLight: "bg-green-50",
        border: "border-green-200",
        borderFocus: "focus:border-green-500",
        text: "text-green-600",
        textDark: "text-green-700",
        button: "bg-green-600",
        buttonHover: "hover:bg-green-200",
        buttonRing: "ring-green-300",
        ringFocus: "focus:ring-green-300",
    },
};

/**
 * Upload section colors by risk level
 */
export const UPLOAD_COLOR_CONFIG: Record<
    string,
    {
        bgLight: string;
        border: string;
        textDark: string;
        button: string;
        buttonHover: string;
        itemBorder: string;
        completeBg: string;
        completeText: string;
    }
> = {
    orange: {
        bgLight: "bg-orange-50",
        border: "border-orange-200",
        textDark: "text-orange-800",
        button: "bg-orange-500",
        buttonHover: "hover:bg-orange-600",
        itemBorder: "border-orange-200",
        completeBg: "bg-orange-500",
        completeText: "text-orange-700",
    },
    yellow: {
        bgLight: "bg-yellow-50",
        border: "border-yellow-200",
        textDark: "text-yellow-800",
        button: "bg-yellow-500",
        buttonHover: "hover:bg-yellow-600",
        itemBorder: "border-yellow-200",
        completeBg: "bg-yellow-500",
        completeText: "text-yellow-700",
    },
    green: {
        bgLight: "bg-green-50",
        border: "border-green-200",
        textDark: "text-green-800",
        button: "bg-green-500",
        buttonHover: "hover:bg-green-600",
        itemBorder: "border-green-200",
        completeBg: "bg-green-500",
        completeText: "text-green-700",
    },
};

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
