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
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-cyan-50 px-4 py-12">
            <div className="max-w-2xl w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        เพิ่มข้อมูลครู
                    </h1>
                    <p className="mt-4 text-lg text-gray-600">
                        กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบโครงการครูนางฟ้า
                    </p>
                </div>

                <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
                    <TeacherProfileForm />
                </div>
            </div>
        </div>
    );
}
