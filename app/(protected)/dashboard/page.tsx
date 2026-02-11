import { requireAuth } from "@/lib/session";
import { Users, School } from "lucide-react";
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
    const session = await requireAuth();
    const isSystemAdmin = session.user.role === "system_admin";

    const dashboardData = await getDashboardData();
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

                    <div className="space-y-6">
                        {/* System admin summary cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-rose-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-md shadow-pink-200 shrink-0">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">
                                        จำนวนนักเรียนในโครงการทั้งหมด
                                    </p>
                                    <p className="text-3xl font-bold text-gray-800">
                                        {studentCount.toLocaleString()} คน
                                    </p>
                                </div>
                            </div>
                            {schoolCount !== undefined && (
                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-rose-100 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-200 shrink-0">
                                        <School className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">
                                            จำนวนโรงเรียนในโครงการ
                                        </p>
                                        <p className="text-3xl font-bold text-gray-800">
                                            {schoolCount.toLocaleString()}{" "}
                                            โรงเรียน
                                        </p>
                                    </div>
                                </div>
                            )}
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
            <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                            ยินดีต้อนรับสู่โครงการครูนางฟ้า
                        </h1>
                        <p className="text-lg text-gray-600">
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

                <div className="space-y-6">
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
