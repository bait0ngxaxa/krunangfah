import { StudentSearch } from "@/components/dashboard/student-search";
import { HeroCard, QuickActionCard } from "@/components/dashboard/cards";
import { type UserRole } from "@/types/auth.types";
import {
    ShieldCheck,
    GraduationCap,
    FileSpreadsheet,
    Users,
    BarChart3,
    Search,
    UserPlus,
    Link as LinkIcon,
    LayoutGrid,
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
    const isSchoolAdmin = userRole === "school_admin";

    return (
        <div className="space-y-3">
            {/* Featured Hero Card — Students */}
            <HeroCard
                href="/students"
                icon={Users}
                title="นักเรียนทั้งหมด"
                badge={
                    studentCount > 0
                        ? `${studentCount.toLocaleString()} คน`
                        : undefined
                }
                description="ดูรายชื่อและข้อมูลผลคัดกรอง PHQ-A"
                isEmpty={!isSystemAdmin && studentCount === 0}
                emptyTitle="ยังไม่มีข้อมูลนักเรียน"
                emptyDescription="นำเข้าข้อมูลนักเรียนเพื่อเริ่มใช้งานระบบคัดกรอง"
            />

            {/* Secondary Action Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* System Admin: Whitelist */}
                {isSystemAdmin && (
                    <QuickActionCard
                        href="/admin/whitelist"
                        icon={ShieldCheck}
                        title="จัดการ Whitelist"
                        description="Admin อีเมล"
                    />
                )}

                {/* System Admin: Invite Links */}
                {isSystemAdmin && (
                    <QuickActionCard
                        href="/admin/invites"
                        icon={LinkIcon}
                        title="Invite Links"
                        description="เชิญ School Admin"
                    />
                )}

                {/* School Admin: Add Teacher */}
                {isSchoolAdmin && (
                    <QuickActionCard
                        href="/teachers/add"
                        icon={UserPlus}
                        title="เพิ่มครูผู้ดูแล"
                        description="เพิ่มครูผู้ดูแล"
                    />
                )}

                {/* School Admin: Manage Classes */}
                {isSchoolAdmin && (
                    <QuickActionCard
                        href="/school/classes"
                        icon={LayoutGrid}
                        title="จัดการห้องเรียนและครู"
                        description="ห้องเรียน / รายชื่อครู"
                    />
                )}

                {/* Teacher-only actions */}
                {!isSystemAdmin && (
                    <>
                        <QuickActionCard
                            href="/teachers/skill"
                            icon={GraduationCap}
                            title="อัพสกิลคุณครู"
                            description="เรียนรู้เพิ่มเติม"
                        />
                        <QuickActionCard
                            href="/students/import"
                            icon={FileSpreadsheet}
                            title="นำเข้าข้อมูลนักเรียน"
                            description="Import Excel"
                        />
                    </>
                )}
            </div>

            {/* Analytics Hero Card */}
            <HeroCard
                href="/analytics"
                icon={BarChart3}
                title="ดูสรุปข้อมูล"
                badge="Analytics"
                description="สรุปภาพรวมผลคัดกรองและสถิติ"
            />

            {/* Search Section */}
            <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(244,114,182,0.15)] border border-pink-200 ring-1 ring-white/80 overflow-hidden group">
                {/* Corner decoration */}
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-linear-to-br from-rose-200/40 to-pink-300/30 rounded-full blur-xl pointer-events-none" />
                <div className="bg-linear-to-r from-pink-400 via-rose-400 to-pink-500 px-5 py-3 flex items-center gap-2.5 relative">
                    {/* Header shimmer */}
                    <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />
                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm shadow-inner ring-1 ring-white/20">
                        <Search className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                        ค้นหานักเรียน
                    </h3>
                </div>
                <div className="p-4 sm:p-5">
                    <StudentSearch />
                </div>
            </div>
        </div>
    );
}
