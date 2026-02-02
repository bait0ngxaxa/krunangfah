import { requireAuth } from "@/lib/auth";
import { getDashboardData } from "@/lib/actions/dashboard.actions";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { TeacherProfileCard } from "@/components/dashboard/TeacherProfileCard";
import { DashboardActionList } from "@/components/dashboard/DashboardActionList";

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard | โครงการครูนางฟ้า",
    description: "หน้าหลักสำหรับครู",
};

export default async function DashboardPage() {
    const session = await requireAuth();

    const { teacher, studentCount } = await getDashboardData(
        session.user.id,
        session.user.role,
    );

    // If no teacher profile, show prompt to create one
    if (!teacher) {
        return (
            <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50 py-8 px-4">
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
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

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
