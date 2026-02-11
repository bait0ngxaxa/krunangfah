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
        <div className="space-y-6">
            {/* จัดการ System Admin - เฉพาะ system_admin */}
            {isSystemAdmin && (
                <ActionCard
                    title="จัดการ System Admin Whitelist"
                    description="เพิ่ม/ลบอีเมลที่มีสิทธิ์เป็น System Admin"
                    buttonText="จัดการ Whitelist"
                    href="/admin/whitelist"
                    variant="primary"
                    icon={<ShieldCheck className="w-5 h-5 text-rose-500" />}
                />
            )}

            {/* เพิ่มข้อมูลคุณครู - เฉพาะ school_admin */}
            {userRole === "school_admin" && (
                <ActionCard
                    title="เพิ่มข้อมูลคุณครู"
                    buttonText="เพิ่มคุณครูผู้ดูแลนักเรียน"
                    href="/teachers/add"
                    variant="primary"
                    icon={<UserPlus className="w-5 h-5 text-rose-500" />}
                />
            )}

            {/* อัพสกิลสำหรับคุณครู - ไม่แสดงสำหรับ system_admin */}
            {!isSystemAdmin && (
                <ActionCard
                    title="อัพสกิลสำหรับคุณครู"
                    buttonText="อัพสกิลสำหรับคุณครู"
                    href="/teachers/skill"
                    variant="primary"
                    icon={<GraduationCap className="w-5 h-5 text-rose-500" />}
                />
            )}

            {/* เพิ่มนักเรียน + PHQ-A - ไม่แสดงสำหรับ system_admin */}
            {!isSystemAdmin && (
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/50 p-6 border border-white/60 relative overflow-hidden group hover:shadow-xl hover:shadow-pink-200/40 transition-all duration-300 ring-1 ring-pink-50">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-rose-300 via-pink-300 to-orange-200 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center flex items-center justify-center gap-2">
                            <ClipboardList className="w-5 h-5 text-rose-500" />
                            จัดการข้อมูลนักเรียน
                        </h3>
                        <ActionCard
                            title="เพิ่มนักเรียน + PHQ-A (Import Excel)"
                            buttonText="นำเข้านักเรียน"
                            href="/students/import"
                            variant="primary"
                            icon={
                                <FileSpreadsheet className="w-5 h-5 text-rose-500" />
                            }
                        />
                    </div>
                </div>
            )}

            {/* นักเรียนของฉัน - แสดงเมื่อมีนักเรียนแล้ว (system_admin แสดงเสมอ) */}
            {(isSystemAdmin || studentCount > 0) && (
                <ActionCard
                    title="รายชื่อนักเรียนทั้งหมด"
                    buttonText={`ดูรายชื่อนักเรียน (${studentCount} คน)`}
                    href="/students"
                    variant="primary"
                    icon={<Users className="w-5 h-5 text-rose-500" />}
                />
            )}

            {/* ดูข้อมูลนักเรียนรายบุคคล */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/50 p-6 border border-white/60 relative overflow-hidden group hover:shadow-xl hover:shadow-pink-200/40 transition-all duration-300 ring-1 ring-pink-50">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-rose-300 via-pink-300 to-orange-200 opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-rose-500" />
                        ค้นหานักเรียน
                    </h3>
                    <StudentSearch />
                </div>
            </div>

            {/* ดูสรุปข้อมูล */}
            <ActionCard
                title="ดูสรุปข้อมูล"
                buttonText="ดู Dashboard (Analytics)"
                href="/analytics"
                variant="primary"
                icon={<BarChart3 className="w-5 h-5 text-rose-500" />}
            />
        </div>
    );
}
