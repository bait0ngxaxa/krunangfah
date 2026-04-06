import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { TeacherProfileForm } from "@/components/teacher/forms/TeacherProfileForm/TeacherProfileForm";
import { PageHeaderCard } from "@/components/ui/PageHeaderCard";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
    getTeacherProfile,
    getAcademicYears,
} from "@/lib/actions/teacher.actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "เพิ่มข้อมูลครู | โครงการครูนางฟ้า",
    description: "กรอกข้อมูลครูเพื่อเข้าใช้งานระบบ",
};

export default async function TeacherProfilePage() {
    const session = await requireAuth();

    // system_admin bypasses onboarding setup screens.
    if (session.user.role === "system_admin") {
        redirect("/dashboard");
    }

    // Existing profile continues remaining onboarding step, otherwise dashboard.
    const existingProfile = await getTeacherProfile(session.user.id);
    if (existingProfile) {
        const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { schoolId: true },
        });
        if (!dbUser?.schoolId) {
            redirect("/school-setup");
        }
        redirect("/dashboard");
    }

    // Server-side fetch keeps form initial render complete.
    const academicYears = await getAcademicYears();

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 py-6 px-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--brand-primary)] rounded-full mix-blend-multiply blur-3xl opacity-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#34D399] rounded-full mix-blend-multiply blur-3xl opacity-10 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <PageHeaderCard
                    icon={GraduationCap}
                    title="เพิ่มข้อมูลครูแอดมินโรงเรียน"
                    description="กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบโครงการครูนางฟ้า"
                    className="mb-8"
                />

                <div className="max-w-2xl mx-auto">
                    <div className="bg-white py-8 px-6 sm:px-8 rounded-3xl border-2 border-gray-100 shadow-sm relative overflow-hidden">
                        <TeacherProfileForm academicYears={academicYears} />
                    </div>
                </div>
            </div>
        </div>
    );
}
