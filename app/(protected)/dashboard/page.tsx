import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { StudentSearch } from "@/components/dashboard/StudentSearch";
import { TeacherProfileCard } from "@/components/dashboard/TeacherProfileCard";

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard | โครงการครูนางฟ้า",
    description: "หน้าหลักสำหรับครู",
};

export default async function DashboardPage() {
    const session = await requireAuth();

    // Check if user has teacher profile
    const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id },
        include: {
            academicYear: true,
            school: true,
        },
    });

    // Count students for this teacher
    const studentCount = teacher
        ? await prisma.student.count({
              where: {
                  schoolId: teacher.schoolId,
                  ...(session.user.role === "class_teacher" && {
                      class: teacher.advisoryClass,
                  }),
              },
          })
        : 0;

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
    const schoolName = teacher.school.name;

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

                    {/* เพิ่มข้อมูลคุณครู - เฉพาะ school_admin */}
                    {session.user.role === "school_admin" && (
                        <ActionCard
                            title="เพิ่มข้อมูลคุณครู"
                            buttonText="เพิ่มคุณครูผู้ดูแลนักเรียน"
                            href="/teachers/add"
                            variant="primary"
                        />
                    )}

                    {/* อัพสกิลสำหรับคุณครู - ทุก role */}
                    <ActionCard
                        title="อัพสกิลสำหรับคุณครู"
                        buttonText="อัพสกิลสำหรับคุณครู"
                        href="/teachers/skill"
                        variant="primary"
                    />

                    {/* เพิ่มนักเรียน + PHQ-A */}
                    {/* Note: Special styling for this card if needed, currently inheriting default or using wrapper */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6 border-2 border-pink-200 hover:border-pink-300 transition-colors">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                            📝 จัดการข้อมูลนักเรียน
                        </h3>
                        <ActionCard
                            title="เพิ่มนักเรียน + PHQ-A (Import Excel/CSV)"
                            buttonText="Import Excel/CSV"
                            href="/students/import"
                            variant="primary"
                        />
                    </div>

                    {/* นักเรียนของฉัน - แสดงเมื่อมีนักเรียนแล้ว */}
                    {studentCount > 0 && (
                        <ActionCard
                            title="นักเรียนของฉัน"
                            buttonText={`ดูรายชื่อนักเรียน (${studentCount} คน)`}
                            href="/students"
                            variant="primary"
                        />
                    )}

                    {/* ดูข้อมูลนักเรียนรายบุคคล */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-pink-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                            🔍 ค้นหานักเรียน
                        </h3>
                        <StudentSearch />
                    </div>

                    {/* ดูสรุปข้อมูล */}
                    <ActionCard
                        title="ดูสรุปข้อมูล"
                        buttonText="ดู Dashboard (Analytics)"
                        href="/analytics"
                        variant="primary"
                    />
                </div>
            </div>
        </div>
    );
}
