import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { StudentSearch } from "@/components/dashboard/StudentSearch";
import { LogoutButton } from "@/components/auth/LogoutButton";
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

    // If no teacher profile, show prompt to create one
    if (!teacher) {
        return (
            <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="flex justify-end mb-4">
                        <LogoutButton />
                    </div>

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
        <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-end mb-4">
                    <LogoutButton />
                </div>

                <DashboardHeader
                    teacherName={teacherName}
                    schoolName={schoolName}
                />

                <div className="space-y-6">
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
                    <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-300">
                        <ActionCard
                            title="เพิ่มนักเรียน + PHQ-A (Import Excel/CSV)"
                            buttonText="เพิ่มนักเรียน + PHQ-A (Import Excel/CSV)"
                            href="/students/import"
                            variant="primary"
                        />
                    </div>

                    {/* ดูข้อมูลนักเรียนรายบุคคล */}
                    <StudentSearch />

                    {/* ดูสรุปข้อมูล */}
                    <ActionCard
                        title="ดูสรุปข้อมูล"
                        buttonText="ดู Dashboard"
                        href="/analytics"
                        variant="primary"
                    />
                </div>
            </div>
        </div>
    );
}
