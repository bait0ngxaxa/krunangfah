/**
 * Healthy Emotion Box Tools Data
 * ข้อมูลเครื่องมือทั้ง 9 ชิ้นใน Healthy Emotion Box
 */

import type { LucideIcon } from "lucide-react";
import {
    NotebookPen,
    BookOpen,
    Library,
    Hand,
    Clapperboard,
    Layers,
    ClipboardList,
    CalendarDays,
    Frame,
} from "lucide-react";

export interface HealthyEmotionTool {
    id: number;
    icon: LucideIcon;
    name: string;
    description: string;
    color:
        | "pink"
        | "purple"
        | "blue"
        | "green"
        | "orange"
        | "cyan"
        | "indigo"
        | "teal"
        | "rose";
}

export const HEALTHY_EMOTION_TOOLS: HealthyEmotionTool[] = [
    {
        id: 1,
        icon: NotebookPen,
        name: "สมุดบันทึกการเดินทางทางอารมณ์",
        description:
            "เครื่องมือที่ช่วยให้นักเรียนรู้จักอารมณ์ที่หลากหลาย และได้ทำความเข้าใจความรู้สึกของตัวเอง ใช้ได้ทั้งการจัดกิจกรรมเดี่ยวและกลุ่ม",
        color: "pink",
    },
    {
        id: 2,
        icon: BookOpen,
        name: "สมุดเรียนรู้ครูนางฟ้า",
        description: "สมุดขยายผลการอบรมสู่คุณครูด้วยกัน",
        color: "purple",
    },
    {
        id: 3,
        icon: Library,
        name: "คู่มือแนะนำการดูแลนักเรียนในสถานศึกษาโดยบูรณาการกับจิตวิทยาเชิงสังคม",
        description:
            "คู่มือที่ออกแบบมาเพื่อทำความเข้าใจการดูแลนักเรียนในสถานศึกษาตลอดกระบวนการ โดยใช้หลักการทางจิตวิทยาสังคม เนื้อหามี 8 ส่วน คือ เข้าใจปัญหาวัยรุ่น แนวคิดหลักในการดูแลนักเรียน การคัดกรอง การแบ่งกลุ่ม การประเมินปัญหา การเสริมพลังกลุ่ม การดูแลนักเรียนกลุ่มรุนแรง และการส่งต่อ",
        color: "blue",
    },
    {
        id: 4,
        icon: Hand,
        name: "บอลบีบมือ Stress Ball",
        description: "บอลที่ช่วยให้เด็กบีบ สัมผัสเพื่อสร้างความผ่อนคลาย",
        color: "green",
    },
    {
        id: 5,
        icon: Clapperboard,
        name: 'ชุดวิดีโอ "6 กระบวนการดูแลนักเรียน" และใบงานในการดูแลช่วยเหลือนักเรียน',
        description:
            "10 ใบงานหลักในการดูแลนักเรียน ประกอบด้วย ใบงานที่ทำให้นักเรียนทบทวนตัวเอง ค้นหาคุณค่าในตัวเอง วางแผนตั้งเป้าหมาย และปรับความคิดและพฤติกรรม",
        color: "orange",
    },
    {
        id: 6,
        icon: Layers,
        name: 'การ์ด "สะท้อน" (Reflection Cards)',
        description:
            "การ์ดภาพสื่อสภาวะอารมณ์ความรู้สึก เหตุการณ์ เรื่องราวในชีวิต ใช้งานได้หลากหลายทั้งในการจัดกิจกรรมเดี่ยวและกลุ่มสำหรับสื่อสารสภาวะอารมณ์ ความคิด เหตุการณ์หรือเรื่องราวที่หลากหลาย",
        color: "cyan",
    },
    {
        id: 7,
        icon: ClipboardList,
        name: "บอร์ดเช็คอินอารมณ์ (Emotional Board)",
        description:
            "เครื่องมือที่ช่วยให้นักเรียนรู้จักอารมณ์ที่หลากหลาย และได้ทำความเข้าใจความรู้สึกของตัวเอง ใช้ได้ทั้งการจัดกิจกรรมเดี่ยวและกลุ่ม",
        color: "indigo",
    },
    {
        id: 8,
        icon: CalendarDays,
        name: "คู่มือการใช้ใบงาน (Worksheet Calendar)",
        description:
            "คู่มือการใช้ใบงานอย่างละเอียด ให้คุณครูได้เข้าใจแนวคิดในการพัฒนา แนวทาง ตลอดจนบทพูดง่ายๆ ในการใช้ใบงาน",
        color: "teal",
    },
    {
        id: 9,
        icon: Frame,
        name: "สมุดเรียนรู้ครูนางฟ้า & โปสเตอร์แนวทางการดูแลนักเรียน",
        description:
            "โปสเตอร์เพื่อสร้างสภาพแวดล้อมทางบวก สำหรับครูและนักเรียนเพื่อสร้างความเข้าใจร่วมกัน",
        color: "rose",
    },
];

export const COLOR_STYLES: Record<string, string> = {
    pink: "bg-pink-500",
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    orange: "bg-orange-500",
    cyan: "bg-cyan-500",
    indigo: "bg-indigo-500",
    teal: "bg-teal-500",
    rose: "bg-rose-500",
};

export const BORDER_STYLES: Record<string, string> = {
    pink: "border-pink-200",
    purple: "border-purple-200",
    blue: "border-blue-200",
    green: "border-green-200",
    orange: "border-orange-200",
    cyan: "border-cyan-200",
    indigo: "border-indigo-200",
    teal: "border-teal-200",
    rose: "border-rose-200",
};
