import dynamic from "next/dynamic";
import { HeroCard } from "@/components/dashboard/cards/HeroCard";
import { QuickActionCard } from "@/components/dashboard/cards/QuickActionCard";
import { type UserRole } from "@/types/auth.types";
import {
    GraduationCap,
    FileSpreadsheet,
    Users,
    BarChart3,
    Search,
    UserPlus,
    Link as LinkIcon,
    Upload,
    UsersRound,
} from "lucide-react";

const StudentSearch = dynamic(
    () =>
        import("@/components/dashboard/student-search/StudentSearch").then(
            (mod) => ({ default: mod.StudentSearch }),
        ),
    {
        loading: () => (
            <div className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
        ),
    },
);

interface DashboardActionListProps {
    userRole: UserRole;
    studentCount: number;
    isPrimary?: boolean;
}

export function DashboardActionList({
    userRole,
    studentCount,
    isPrimary,
}: DashboardActionListProps) {
    const isSystemAdmin = userRole === "system_admin";
    const isSchoolAdmin = userRole === "school_admin";

    return (
        <div className="space-y-3">
            {!isSystemAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <QuickActionCard
                        href="/teachers/skill"
                        icon={GraduationCap}
                        title="อัพสกิลคุณครู"
                        description="เรียนรู้เพิ่มเติม"
                        imageSrc="/image/dashboard/teacherskills.png"
                    />
                    <QuickActionCard
                        href="/students/import"
                        icon={FileSpreadsheet}
                        title="นำเข้าข้อมูลนักเรียน"
                        description=""
                        imageSrc="/image/dashboard/import.webp"
                        imageClassName="w-[85px] sm:w-[95px]"
                        actionButton={
                            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0BD0D9] text-white text-[11px] sm:text-xs font-bold rounded-xl shadow-sm hover:brightness-95 transition-all">
                                <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Import Excel</span>
                            </div>
                        }
                    />
                </div>
            )}

            <HeroCard
                href="/students"
                icon={Users}
                title="นักเรียนทั้งหมด"
                badge={
                    studentCount > 0
                        ? `${studentCount.toLocaleString()} คน`
                        : undefined
                }
                description="ดูรายชื่อและข้อมูลคัดกรอง"
                imageSrc="/image/dashboard/students.webp"
                theme="emerald"
                isEmpty={!isSystemAdmin && studentCount === 0}
                emptyTitle="ยังไม่มีข้อมูลนักเรียน"
                emptyDescription="นำเข้าข้อมูลนักเรียนเพื่อเริ่มใช้งานระบบคัดกรอง"
            />

            {(isSystemAdmin || isSchoolAdmin) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {isSystemAdmin && (
                        <QuickActionCard
                            href="/admin/users"
                            icon={UsersRound}
                            title="จัดการผู้ใช้งาน"
                            description="ดูข้อมูลผู้ใช้ในระบบ"
                        />
                    )}

                    {isSystemAdmin && (
                        <QuickActionCard
                            href="/admin/invites"
                            icon={LinkIcon}
                            title="Invite Links"
                            description="เชิญ Admin"
                        />
                    )}

                    {isSchoolAdmin && (
                        <QuickActionCard
                            href="/teachers/add"
                            icon={UserPlus}
                            title="ส่งคำเชิญเข้าระบบ"
                            description="ห้องเรียน / ข้อมูลครู / เชิญครู"
                        />
                    )}

                    {isSchoolAdmin && isPrimary && (
                        <QuickActionCard
                            href="/school/classes"
                            icon={UsersRound}
                            title="จัดการครูในระบบ"
                            description="แก้ไขห้อง / จัดการสิทธิ์"
                        />
                    )}
                </div>
            )}

            <HeroCard
                href="/analytics"
                icon={BarChart3}
                title="ดูสรุปข้อมูล"
                description="สรุปภาพรวมผลคัดกรองและสถิติ"
                imageSrc="/image/dashboard/analytics.png"
                theme="teal"
            />

            <div className="relative bg-white rounded-2xl shadow-sm border-2 border-gray-100 overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-linear-to-br from-green-200/40 to-emerald-300/30 rounded-full blur-xl pointer-events-none" />
                <div className="bg-linear-to-r from-emerald-400 via-green-400 to-emerald-500 px-5 py-3 flex items-center gap-2.5 relative">
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
