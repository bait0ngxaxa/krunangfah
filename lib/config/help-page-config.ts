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

export const COLOR_CONFIG: Record<string, ColorTheme> = {
    orange: {
        gradient: "from-orange-500 to-amber-500",
        bg: "bg-orange-500",
        text: "สีส้ม",
        lightBg: "bg-orange-50",
    },
    yellow: {
        gradient: "from-yellow-400 to-amber-400",
        bg: "bg-yellow-400",
        text: "สีเหลือง",
        lightBg: "bg-yellow-50",
    },
    green: {
        gradient: "from-green-500 to-emerald-500",
        bg: "bg-green-500",
        text: "สีเขียว",
        lightBg: "bg-green-50",
    },
    red: {
        gradient: "from-red-500 to-rose-500",
        bg: "bg-red-500",
        text: "สีแดง",
        lightBg: "bg-red-50",
    },
    blue: {
        gradient: "from-blue-500 to-cyan-500",
        bg: "bg-blue-500",
        text: "สีน้ำเงิน",
        lightBg: "bg-blue-50",
    },
};
