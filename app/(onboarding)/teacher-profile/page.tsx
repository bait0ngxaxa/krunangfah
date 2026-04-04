import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { TeacherProfileForm } from "@/components/teacher/forms/TeacherProfileForm/TeacherProfileForm";
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
            <div className="absolute top-0 left-0 w-96 h-96 bg-[#0BD0D9] rounded-full mix-blend-multiply blur-3xl opacity-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#34D399] rounded-full mix-blend-multiply blur-3xl opacity-10 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="relative bg-white rounded-4xl border-2 border-[#0BD0D9] shadow-sm p-5 sm:p-6 mb-8 overflow-hidden group">
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#0BD0D9]/10 rounded-full blur-xl pointer-events-none" />

                    <div className="relative flex items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#0BD0D9] flex items-center justify-center shadow-md group-hover:-translate-y-1 transition-transform duration-300">
                                <GraduationCap className="w-6 h-6 text-[#0BD0D9] stroke-[2.5]" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                                เพิ่มข้อมูลครูแอดมินโรงเรียน
                            </h1>
                            <p className="text-sm text-gray-500">
                                กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบโครงการครูนางฟ้า
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto">
                    <div className="bg-white py-8 px-6 sm:px-8 rounded-3xl border-2 border-gray-100 shadow-sm relative overflow-hidden">
                        <TeacherProfileForm academicYears={academicYears} />
                    </div>
                </div>
            </div>
        </div>
    );
}
