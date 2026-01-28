import { TeacherProfileForm } from "@/components/teacher/TeacherProfileForm";
import { requireAuth } from "@/lib/auth";
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
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 px-4 py-12 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-10 left-10 w-40 h-40 bg-pink-200 rounded-full mix-blend-multiply filter blur-2xl opacity-60 animate-bounce delay-1000 duration-3000" />
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-60 animate-bounce delay-500 duration-4000" />

            <div className="max-w-2xl w-full space-y-8 relative z-10">
                <div className="text-center">
                    <div className="mb-4 inline-block p-3 rounded-full bg-white/50 backdrop-blur-xs shadow-sm">
                        <span className="text-3xl">👩‍🏫</span>
                    </div>
                    <h1 className="text-4xl font-bold bg-linear-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                        เพิ่มข้อมูลครู
                    </h1>
                    <p className="mt-4 text-lg text-gray-600 font-medium">
                        กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบโครงการครูนางฟ้า
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur-md py-8 px-6 shadow-xl rounded-3xl border border-white/50 relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-pink-300 to-purple-300 rounded-t-3xl" />
                    <TeacherProfileForm />
                </div>
            </div>
        </div>
    );
}
