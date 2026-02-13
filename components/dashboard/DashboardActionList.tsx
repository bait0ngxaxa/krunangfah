import { ActionCard } from "@/components/dashboard/cards/ActionCard";
import { StudentSearch } from "@/components/dashboard/StudentSearch";
import { type UserRole } from "@/types/auth.types";
import {
    ShieldCheck,
    UserPlus,
    GraduationCap,
    FileSpreadsheet,
    Users,
    BarChart3,
    Search,
    ClipboardList,
} from "lucide-react";

interface DashboardActionListProps {
    userRole: UserRole;
    studentCount: number;
}

export function DashboardActionList({
    userRole,
    studentCount,
}: DashboardActionListProps) {
    const isSystemAdmin = userRole === "system_admin";

    return (
        <div className="space-y-5">
            {/* จัดการ System Admin - เฉพาะ system_admin */}
            {isSystemAdmin && (
                <ActionCard
                    title="จัดการ System Admin Whitelist"
                    description="เพิ่ม/ลบอีเมลที่มีสิทธิ์เป็น System Admin"
                    buttonText="จัดการ Whitelist"
                    href="/admin/whitelist"
                    variant="primary"
                    icon={<ShieldCheck className="w-5 h-5" />}
                />
            )}

            {/* เพิ่มข้อมูลคุณครู - เฉพาะ school_admin */}
            {userRole === "school_admin" && (
                <ActionCard
                    title="เพิ่มข้อมูลคุณครู"
                    buttonText="เพิ่มคุณครูผู้ดูแลนักเรียน"
                    href="/teachers/add"
                    variant="primary"
                    icon={<UserPlus className="w-5 h-5" />}
                />
            )}

            {/* อัพสกิลสำหรับคุณครู - ไม่แสดงสำหรับ system_admin */}
            {!isSystemAdmin && (
                <ActionCard
                    title="อัพสกิลสำหรับคุณครู"
                    buttonText="อัพสกิลสำหรับคุณครู"
                    href="/teachers/skill"
                    variant="primary"
                    icon={<GraduationCap className="w-5 h-5" />}
                />
            )}

            {/* เพิ่มนักเรียน + PHQ-A - ไม่แสดงสำหรับ system_admin */}
            {!isSystemAdmin && (
                <SectionCard
                    icon={<ClipboardList className="w-4 h-4 text-white" />}
                    title="จัดการข้อมูลนักเรียน"
                    gradient="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600"
                >
                    <ActionCard
                        title="เพิ่มนักเรียน + PHQ-A (Import Excel)"
                        buttonText="นำเข้านักเรียน"
                        href="/students/import"
                        variant="primary"
                        icon={<FileSpreadsheet className="w-5 h-5" />}
                    />
                </SectionCard>
            )}

            {/* นักเรียนของฉัน - แสดงเมื่อมีนักเรียนแล้ว (system_admin แสดงเสมอ) */}
            {(isSystemAdmin || studentCount > 0) && (
                <ActionCard
                    title="รายชื่อนักเรียนทั้งหมด"
                    buttonText={`ดูรายชื่อนักเรียน (${studentCount} คน)`}
                    href="/students"
                    variant="primary"
                    icon={<Users className="w-5 h-5" />}
                />
            )}

            {/* ดูข้อมูลนักเรียนรายบุคคล */}
            <SectionCard
                icon={<Search className="w-4 h-4 text-white" />}
                title="ค้นหานักเรียน"
                gradient="bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500"
            >
                <StudentSearch />
            </SectionCard>

            {/* ดูสรุปข้อมูล */}
            <ActionCard
                title="ดูสรุปข้อมูล"
                buttonText="ดู Dashboard (Analytics)"
                href="/analytics"
                variant="secondary"
                icon={<BarChart3 className="w-5 h-5" />}
            />
        </div>
    );
}

function SectionCard({
    icon,
    title,
    gradient,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    gradient: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 overflow-hidden">
            <div className={`${gradient} px-5 py-3 flex items-center gap-2.5`}>
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                    {icon}
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                    {title}
                </h3>
            </div>
            <div className="p-4 sm:p-5">{children}</div>
        </div>
    );
}
