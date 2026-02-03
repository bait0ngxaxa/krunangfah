// components/student/activity/ActivityProgressTable/constants.ts

/**
 * Activity configuration constants
 */

export interface Activity {
    id: string;
    name: string;
    number: number;
}

export const ACTIVITIES: Activity[] = [
    { id: "a1", name: "รู้จักตัวเอง", number: 1 },
    { id: "a2", name: "ค้นหาคุณค่าที่ฉันมี", number: 2 },
    { id: "a3", name: "ปรับความคิด ชีวิตเปลี่ยน", number: 3 },
    { id: "a4", name: "รู้จักตัวกระตุ้น", number: 4 },
    { id: "a5", name: "ตามติดเพื่อไปต่อ", number: 5 },
];

export const ACTIVITY_INDICES: Record<string, number[]> = {
    orange: [1, 2, 3, 4, 5],
    yellow: [1, 2, 3, 5],
    green: [1, 2, 5],
};
