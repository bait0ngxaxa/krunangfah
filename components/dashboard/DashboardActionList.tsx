import Link from "next/link";
import { StudentSearch } from "@/components/dashboard/student-search";
import { type UserRole } from "@/types/auth.types";
import {
    ShieldCheck,
    GraduationCap,
    FileSpreadsheet,
    Users,
    BarChart3,
    Search,
    UserPlus,
    type LucideIcon,
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
            {(isSystemAdmin || studentCount > 0) && (
                <Link
                    href="/students"
                    className="relative flex items-center gap-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(244,114,182,0.15)] border border-pink-200 ring-1 ring-white/80 p-5 group hover:shadow-[0_8px_24px_-4px_rgba(244,114,182,0.25),0_4px_12px_-2px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-pink-300 hover:ring-pink-100 transition-all duration-300 overflow-hidden"
                >
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-linear-to-br from-rose-200/30 to-pink-300/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                    {/* Accent bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-400 via-pink-400 to-rose-300 opacity-0 group-hover:opacity-60 transition-opacity duration-300" />

                    <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                        <div className="relative w-14 h-14 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-200/50 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                            <Users className="w-7 h-7 text-white" />
                        </div>
                    </div>

                    <div className="relative flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                            <h3 className="font-bold text-gray-800 group-hover:text-transparent group-hover:bg-linear-to-r group-hover:from-rose-500 group-hover:to-pink-600 group-hover:bg-clip-text transition-colors duration-300">
                                นักเรียนทั้งหมด
                            </h3>
                            <span className="px-2.5 py-0.5 text-xs font-bold bg-linear-to-r from-rose-100 to-pink-100 text-pink-600 rounded-full ring-1 ring-pink-200/50">
                                {studentCount.toLocaleString()} คน
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 group-hover:text-gray-600 transition-colors truncate">
                            ดูรายชื่อและข้อมูลผลคัดกรอง PHQ-A
                        </p>
                    </div>

                    {/* Arrow */}
                    <div className="relative opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 shrink-0">
                        <svg
                            className="w-5 h-5 text-pink-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </div>
                </Link>
            )}

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

                {/* School Admin: Add Teacher */}
                {isSchoolAdmin && (
                    <QuickActionCard
                        href="/teachers/add"
                        icon={UserPlus}
                        title="เพิ่มครูผู้ดูแล"
                        description="เพิ่มครูผู้ดูแล"
                    />
                )}

                {/* Teacher-only actions */}
                {!isSystemAdmin && (
                    <>
                        <QuickActionCard
                            href="/students/import"
                            icon={FileSpreadsheet}
                            title="นำเข้าข้อมูลนักเรียน"
                            description="Import Excel"
                        />
                        <QuickActionCard
                            href="/teachers/skill"
                            icon={GraduationCap}
                            title="อัพสกิลคุณครู"
                            description="เรียนรู้เพิ่มเติม"
                        />
                    </>
                )}

                {/* Analytics — always visible */}
                <QuickActionCard
                    href="/analytics"
                    icon={BarChart3}
                    title="ดูสรุปข้อมูล"
                    description="Analytics"
                />
            </div>

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

/* ─── QuickActionCard ─── */

interface QuickActionCardProps {
    href: string;
    icon: LucideIcon;
    title: string;
    description: string;
}

function QuickActionCard({
    href,
    icon: Icon,
    title,
    description,
}: QuickActionCardProps) {
    return (
        <Link
            href={href}
            className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(244,114,182,0.15)] border border-pink-200 ring-1 ring-white/80 p-5 group hover:shadow-[0_8px_24px_-4px_rgba(244,114,182,0.25),0_4px_12px_-2px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-pink-300 hover:ring-pink-100 transition-all duration-300 block overflow-hidden"
        >
            {/* Decorative gradient corner */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-linear-to-br from-rose-200/30 to-pink-300/20 rounded-full blur-xl group-hover:scale-[1.8] transition-transform duration-500 pointer-events-none" />
            {/* Shimmer top line */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
                <div className="p-2.5 rounded-xl bg-linear-to-br from-rose-100 to-pink-100 shadow-inner ring-1 ring-rose-200/50 text-rose-500 w-fit mb-3 group-hover:from-rose-200 group-hover:to-pink-200 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-pink-200/50 transition-all duration-300">
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-800 group-hover:text-transparent group-hover:bg-linear-to-r group-hover:from-rose-500 group-hover:to-pink-600 group-hover:bg-clip-text transition-colors duration-300">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 group-hover:text-gray-600 transition-colors">
                            {description}
                        </p>
                    </div>
                    {/* Arrow indicator */}
                    <div className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        <svg
                            className="w-5 h-5 text-pink-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}
