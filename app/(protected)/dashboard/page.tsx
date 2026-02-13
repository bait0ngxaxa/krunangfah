import { requireAuth } from "@/lib/session";
import {
    Users,
    School,
    Sparkles,
    DoorOpen,
    Briefcase,
    CalendarDays,
    type LucideIcon,
} from "lucide-react";
import { getDashboardData } from "@/lib/actions/dashboard.actions";
import {
    DashboardHeader,
    ActionCard,
    DashboardActionList,
} from "@/components/dashboard";

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "หน้าหลัก | โครงการครูนางฟ้า",
    description: "หน้าหลักสำหรับครู",
};

const PROJECT_ROLE_LABELS: Record<string, string> = {
    lead: "ทีมนำ (Lead)",
    care: "ทีมดูแล (Care)",
    coordinate: "ทีมประสานงาน (Coordinate)",
};

export default async function DashboardPage() {
    const [session, dashboardData] = await Promise.all([
        requireAuth(),
        getDashboardData(),
    ]);
    const isSystemAdmin = session.user.role === "system_admin";
    const { teacher, studentCount } = dashboardData;
    const schoolCount =
        "schoolCount" in dashboardData
            ? (dashboardData as { schoolCount?: number }).schoolCount
            : undefined;

    // ─── System Admin Dashboard ───
    if (isSystemAdmin) {
        return (
            <DashboardShell>
                <DashboardHeader
                    teacherName={session.user.name || "System Admin"}
                    schoolName="ผู้ดูแลระบบ (ทุกโรงเรียน)"
                    subtitle="ผู้ดูแลระบบ"
                />

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <StatCard
                        icon={Users}
                        label="นักเรียนทั้งหมด"
                        value={studentCount.toLocaleString()}
                        unit="คน"
                    />
                    {schoolCount !== undefined && (
                        <StatCard
                            icon={School}
                            label="โรงเรียน"
                            value={schoolCount.toLocaleString()}
                            unit="โรงเรียน"
                        />
                    )}
                </div>

                <DashboardActionList
                    userRole={session.user.role}
                    studentCount={studentCount}
                />
            </DashboardShell>
        );
    }

    // ─── No Teacher Profile ───
    if (!teacher) {
        return (
            <DashboardShell>
                <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center p-3 bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg ring-1 ring-white/60 mb-5">
                        <Sparkles className="w-8 h-8 text-pink-400" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
                        ยินดีต้อนรับสู่โครงการครูนางฟ้า
                    </h1>
                    <p className="text-base text-gray-500 mb-8">
                        กรุณากรอกข้อมูลครูเพื่อเริ่มใช้งานระบบ
                    </p>

                    <ActionCard
                        title="เพิ่มข้อมูลครู"
                        description="กรอกข้อมูลส่วนตัวและบทบาทในโครงการ"
                        buttonText="กรอกข้อมูลครู"
                        href="/teacher-profile"
                        variant="primary"
                    />
                </div>
            </DashboardShell>
        );
    }

    // ─── Teacher Dashboard ───
    const teacherName = `${teacher.firstName} ${teacher.lastName}`;
    const schoolName = teacher.user.school?.name || "ไม่ระบุ";
    const isClassTeacher = session.user.role === "class_teacher";
    const projectRoleLabel =
        PROJECT_ROLE_LABELS[teacher.projectRole] || teacher.projectRole;
    const academicYearText = `${teacher.academicYear.year} เทอม ${teacher.academicYear.semester}`;

    return (
        <DashboardShell>
            <DashboardHeader
                teacherName={teacherName}
                schoolName={schoolName}
                subtitle={isClassTeacher ? "ครูประจำชั้น" : "ครูนางฟ้า"}
                extra={
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 rounded-xl text-xs font-medium text-pink-600">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>ปี {academicYearText}</span>
                    </div>
                }
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <StatCard
                    icon={Users}
                    label="นักเรียน"
                    value={studentCount.toLocaleString()}
                    unit="คน"
                />
                {isClassTeacher && (
                    <StatCard
                        icon={DoorOpen}
                        label="ห้องที่ดูแล"
                        value={teacher.advisoryClass}
                    />
                )}
                <StatCard
                    icon={Briefcase}
                    label="บทบาทโครงการ"
                    value={projectRoleLabel}
                />
            </div>

            <DashboardActionList
                userRole={session.user.role}
                studentCount={studentCount}
            />
        </DashboardShell>
    );
}

/* ─── Layout Shell ─── */

function DashboardShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-100 py-6 px-4 relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">{children}</div>
        </div>
    );
}

/* ─── Stat Card ─── */

function StatCard({
    icon: Icon,
    label,
    value,
    unit,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    unit?: string;
}) {
    return (
        <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 p-4 group hover:shadow-xl hover:shadow-pink-200/40 hover:-translate-y-1 hover:ring-pink-100 transition-all duration-300 overflow-hidden cursor-default">
            {/* Decorative gradient corner */}
            <div className="absolute -top-8 -right-8 w-20 h-20 bg-linear-to-br from-rose-200/40 to-pink-300/30 rounded-full blur-lg group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
            {/* Subtle shimmer line */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative flex items-center gap-2.5 mb-2.5">
                <div className="p-2 rounded-xl bg-linear-to-br from-rose-100 to-pink-100 shadow-inner ring-1 ring-rose-200/50 group-hover:from-rose-200 group-hover:to-pink-200 transition-colors duration-300">
                    <Icon className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                    {label}
                </span>
            </div>
            <div className="relative flex items-baseline gap-1.5">
                <p className="text-2xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent group-hover:from-rose-600 group-hover:to-pink-600 transition-all duration-300">
                    {value}
                </p>
                {unit ? (
                    <span className="text-xs font-medium text-gray-400 group-hover:text-pink-400 transition-colors duration-300">
                        {unit}
                    </span>
                ) : null}
            </div>
        </div>
    );
}
