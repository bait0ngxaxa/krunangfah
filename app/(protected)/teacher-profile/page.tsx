import { GraduationCap } from "lucide-react";
import { TeacherProfileForm } from "@/components/teacher";
import { requireAuth } from "@/lib/session";
import { redirect } from "next/navigation";
import { getTeacherProfile } from "@/lib/actions/teacher.actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "เพิ่มข้อมูลครู | โครงการครูนางฟ้า",
    description: "กรอกข้อมูลครูเพื่อเข้าใช้งานระบบ",
};

export default async function TeacherProfilePage() {
    const session = await requireAuth();

    // Check if already has teacher profile
    const existingProfile = await getTeacherProfile(session.user.id);
    if (existingProfile) {
        redirect("/");
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-rose-50 via-white to-pink-50 px-4 py-12 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-10 left-5 sm:top-20 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse delay-75" />
            <div className="absolute bottom-10 right-5 sm:bottom-20 sm:right-10 w-48 h-48 sm:w-72 sm:h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse delay-150" />

            <div className="max-w-2xl w-full space-y-8 relative z-10">
                <div className="text-center">
                    <div className="mb-4 inline-block p-4 rounded-2xl bg-white/50 backdrop-blur-sm shadow-sm border border-white/50">
                        <GraduationCap className="w-10 h-10 text-pink-500" />
                    </div>
                    <h1 className="text-4xl font-bold bg-linear-to-r from-rose-400 to-pink-500 bg-clip-text text-transparent drop-shadow-sm">
                        เพิ่มข้อมูลครู
                    </h1>
                    <p className="mt-4 text-lg text-gray-600 font-medium">
                        กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบโครงการครูนางฟ้า
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur-md py-8 px-8 shadow-xl shadow-pink-100/50 rounded-3xl border border-white/60 relative ring-1 ring-pink-50">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-300 via-pink-300 to-orange-300 rounded-t-3xl" />
                    <TeacherProfileForm />
                </div>
            </div>
        </div>
    );
}
