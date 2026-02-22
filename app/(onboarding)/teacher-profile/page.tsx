import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { TeacherProfileForm } from "@/components/teacher";
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

    // system_admin ไม่ต้องสร้าง teacher profile
    if (session.user.role === "system_admin") {
        redirect("/dashboard");
    }

    // Already has teacher profile → continue onboarding or go to dashboard
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

    // Pre-fetch academic years on the server
    const academicYears = await getAcademicYears();

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-emerald-50 via-white to-teal-50 px-4 py-12 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-10 left-5 sm:top-20 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 bg-[#0BD0D9] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-75" />
            <div className="absolute bottom-10 right-5 sm:bottom-20 sm:right-10 w-48 h-48 sm:w-72 sm:h-72 bg-[#34D399] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-150" />

            <div className="max-w-2xl w-full space-y-8 relative z-10">
                <div className="relative bg-white rounded-4xl border-2 border-[#0BD0D9] shadow-sm p-5 sm:p-6 overflow-hidden group text-center md:text-left">
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#0BD0D9]/10 rounded-full blur-xl pointer-events-none" />

                    <div className="relative flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                        {/* Animated icon */}
                        <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-2xl bg-[#0BD0D9] flex items-center justify-center shadow-md group-hover:-translate-y-1 transition-transform duration-300">
                                <GraduationCap className="w-6 h-6 text-white stroke-[2.5]" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                                เพิ่มข้อมูลครูแอดมินโรงเรียน
                            </h1>
                            <p className="text-sm font-medium text-slate-500 mt-0.5">
                                กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบโครงการครูนางฟ้า
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white py-8 px-8 rounded-3xl border-2 border-gray-100 shadow-sm relative overflow-hidden">
                    <TeacherProfileForm academicYears={academicYears} />
                </div>
            </div>
        </div>
    );
}
