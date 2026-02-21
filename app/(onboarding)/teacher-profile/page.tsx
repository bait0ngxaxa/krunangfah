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
        // Check DB for schoolId (JWT may be stale)
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
            <div className="absolute top-10 left-5 sm:top-20 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse delay-75" />
            <div className="absolute bottom-10 right-5 sm:bottom-20 sm:right-10 w-48 h-48 sm:w-72 sm:h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse delay-150" />

            <div className="max-w-2xl w-full space-y-8 relative z-10">
                <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 border border-emerald-200 ring-1 ring-emerald-50 p-5 sm:p-6 overflow-hidden group text-center md:text-left">
                    {/* Gradient accent bottom border */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-emerald-400 via-teal-400 to-emerald-300 opacity-60" />
                    {/* Top shimmer */}
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-linear-to-br from-emerald-200/20 to-teal-300/15 rounded-full blur-xl pointer-events-none" />

                    <div className="relative flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                        {/* Animated icon */}
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                            <div className="relative w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                                <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                                <span className="bg-linear-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                                    เพิ่มข้อมูลครูแอดมินโรงเรียน
                                </span>
                            </h1>
                            <p className="text-sm text-gray-500">
                                กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบโครงการครูนางฟ้า
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md py-8 px-8 shadow-xl shadow-emerald-100/50 rounded-3xl border border-emerald-200 relative ring-1 ring-emerald-50">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-emerald-300 via-teal-300 to-cyan-300 rounded-t-3xl" />
                    <TeacherProfileForm academicYears={academicYears} />
                </div>
            </div>
        </div>
    );
}
