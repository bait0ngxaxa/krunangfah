import { requireAuth } from "@/lib/session";
import {
    Users,
    School,
    Sparkles,
    DoorOpen,
    Briefcase,
    CalendarDays,
} from "lucide-react";
import { getDashboardData } from "@/lib/actions/dashboard.actions";
import {
    DashboardHeader,
    ActionCard,
    DashboardActionList,
} from "@/components/dashboard";
import type { StatItem } from "@/components/dashboard/DashboardHeader";

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "หน้าหลัก | โครงการครูนางฟ้า",
    description: "หน้าหลักสำหรับครู",
};

/* ─── Constants ─── */

const PROJECT_ROLE_LABELS: Record<string, string> = {
    lead: "ทีมนำ (Lead)",
    care: "ทีมดูแล (Care)",
    coordinate: "ทีมประสานงาน (Coordinate)",
};

/* ─── Stat Builders ─── */

function buildAdminStats(
    studentCount: number,
    schoolCount?: number,
): StatItem[] {
    const stats: StatItem[] = [
        {
            icon: Users,
            label: "นักเรียนทั้งหมด",
            value: studentCount.toLocaleString(),
            unit: "คน",
            color: "pink",
        },
    ];
    if (schoolCount !== undefined) {
        stats.push({
            icon: School,
            label: "โรงเรียน",
            value: schoolCount.toLocaleString(),
            unit: "โรงเรียน",
            color: "purple",
        });
    }
    return stats;
}

function buildTeacherStats(
    studentCount: number,
    advisoryClass: string,
    projectRole: string,
    isClassTeacher: boolean,
): StatItem[] {
    const roleLabel = PROJECT_ROLE_LABELS[projectRole] || projectRole;
    const stats: StatItem[] = [
        {
            icon: Users,
            label: "นักเรียน",
            value: studentCount.toLocaleString(),
            unit: "คน",
            color: "pink",
        },
    ];
    if (isClassTeacher) {
        stats.push({
            icon: DoorOpen,
            label: "ห้องที่ดูแล",
            value: advisoryClass,
            color: "blue",
        });
    }
    stats.push({
        icon: Briefcase,
        label: "บทบาท",
        value: roleLabel,
        color: "orange",
    });
    return stats;
}

/* ─── Page Component ─── */

export default async function DashboardPage() {
    const [session, dashboardData] = await Promise.all([
        requireAuth(),
        getDashboardData(),
    ]);

    const { teacher, studentCount } = dashboardData;
    const userRole = session.user.role;
    const isSystemAdmin = userRole === "system_admin";
    const schoolCount =
        "schoolCount" in dashboardData
            ? (dashboardData as { schoolCount?: number }).schoolCount
            : undefined;

    // ─── System Admin ───
    if (isSystemAdmin) {
        return (
            <DashboardShell>
                <DashboardHeader
                    teacherName={session.user.name || "System Admin"}
                    schoolName="ผู้ดูแลระบบ (ทุกโรงเรียน)"
                    subtitle="ผู้ดูแลระบบ"
                    stats={buildAdminStats(studentCount, schoolCount)}
                />
                <DashboardActionList
                    userRole={userRole}
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
    const isClassTeacher = userRole === "class_teacher";
    const teacherName = `${teacher.firstName} ${teacher.lastName}`;
    const schoolName = teacher.user.school?.name || "ไม่ระบุ";
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
                stats={buildTeacherStats(
                    studentCount,
                    teacher.advisoryClass,
                    teacher.projectRole,
                    isClassTeacher,
                )}
            />
            <DashboardActionList
                userRole={userRole}
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
