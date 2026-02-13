import { requireAuth } from "@/lib/session";
import { Users, School, Sparkles } from "lucide-react";
import { getDashboardData } from "@/lib/actions/dashboard.actions";
import {
    DashboardHeader,
    ActionCard,
    TeacherProfileCard,
    DashboardActionList,
} from "@/components/dashboard";

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "หน้าหลัก | โครงการครูนางฟ้า",
    description: "หน้าหลักสำหรับครู",
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

    // system_admin: show admin-specific dashboard
    if (isSystemAdmin) {
        return (
            <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-100 py-8 px-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

                <div className="max-w-4xl mx-auto relative z-10">
                    <DashboardHeader
                        teacherName={session.user.name || "System Admin"}
                        schoolName="ผู้ดูแลระบบ (ทุกโรงเรียน)"
                    />

                    <div className="space-y-5">
                        {/* System admin summary cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SummaryCard
                                icon={<Users className="w-5 h-5 text-white" />}
                                gradient="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600"
                                label="นักเรียนในโครงการทั้งหมด"
                                value={studentCount.toLocaleString()}
                                unit="คน"
                            />
                            {schoolCount !== undefined ? (
                                <SummaryCard
                                    icon={
                                        <School className="w-5 h-5 text-white" />
                                    }
                                    gradient="bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500"
                                    label="โรงเรียนในโครงการ"
                                    value={schoolCount.toLocaleString()}
                                    unit="โรงเรียน"
                                />
                            ) : null}
                        </div>

                        {/* รายการเมนู */}
                        <DashboardActionList
                            userRole={session.user.role}
                            studentCount={studentCount}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // If no teacher profile, show prompt to create one
    if (!teacher) {
        return (
            <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-8 px-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                <div className="max-w-2xl mx-auto relative z-10">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center p-3 bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg ring-1 ring-white/60 mb-5">
                            <Sparkles className="w-8 h-8 text-pink-400" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                            ยินดีต้อนรับสู่โครงการครูนางฟ้า
                        </h1>
                        <p className="text-base text-gray-500">
                            กรุณากรอกข้อมูลครูเพื่อเริ่มใช้งานระบบ
                        </p>
                    </div>

                    <ActionCard
                        title="เพิ่มข้อมูลครู"
                        description="กรอกข้อมูลส่วนตัวและบทบาทในโครงการ"
                        buttonText="กรอกข้อมูลครู"
                        href="/teacher-profile"
                        variant="primary"
                    />
                </div>
            </div>
        );
    }

    const teacherName = `${teacher.firstName} ${teacher.lastName}`;
    const schoolName = teacher.user.school?.name || "ไม่ระบุ";

    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-100 py-8 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <DashboardHeader
                    teacherName={teacherName}
                    schoolName={schoolName}
                />

                <div className="space-y-5">
                    {/* ข้อมูลครู */}
                    <TeacherProfileCard
                        teacher={teacher}
                        userRole={session.user.role}
                    />

                    {/* รายการเมนู */}
                    <DashboardActionList
                        userRole={session.user.role}
                        studentCount={studentCount}
                    />
                </div>
            </div>
        </div>
    );
}

function SummaryCard({
    icon,
    gradient,
    label,
    value,
    unit,
}: {
    icon: React.ReactNode;
    gradient: string;
    label: string;
    value: string;
    unit: string;
}) {
    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 overflow-hidden">
            <div className={`${gradient} px-5 py-2.5 flex items-center gap-2`}>
                <div className="p-1 bg-white/20 rounded-lg backdrop-blur-sm">
                    {icon}
                </div>
                <span className="text-xs font-bold text-white/90 tracking-wide">
                    {label}
                </span>
            </div>
            <div className="px-5 py-5 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-800">
                    {value}
                </span>
                <span className="text-sm font-medium text-gray-500">
                    {unit}
                </span>
            </div>
        </div>
    );
}
