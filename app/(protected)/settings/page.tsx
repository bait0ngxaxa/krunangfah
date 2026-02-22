import { requireAuth } from "@/lib/session";
import { getCurrentUserProfile } from "@/lib/actions/profile.actions";
import { getAcademicYears } from "@/lib/actions/academic-year.actions";
import { hasStudents } from "@/lib/actions/navbar.actions";
import { redirect } from "next/navigation";
import { Tabs } from "@/components/ui/Tabs";
import {
    ProfileSettingsForm,
    SecuritySettingsForm,
} from "@/components/settings";
import { Settings, Lock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ตั้งค่าบัญชี | ครูนางฟ้า",
    description: "จัดการข้อมูลส่วนตัวและความปลอดภัย",
};

export default async function SettingsPage() {
    const session = await requireAuth();

    // system_admin doesn't have teacher profile, redirect to dashboard
    if (session.user.role === "system_admin") {
        redirect("/dashboard");
    }

    // Parallel fetch for better performance
    const [profile, academicYears, teacherHasStudents] = await Promise.all([
        getCurrentUserProfile(),
        getAcademicYears(),
        hasStudents(),
    ]);

    if (!profile) {
        // User doesn't have teacher profile yet, redirect to create one
        redirect("/teacher-profile");
    }

    const tabs = [
        {
            id: "profile",
            label: (
                <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span>ข้อมูลส่วนตัว</span>
                </div>
            ),
            content: (
                <ProfileSettingsForm
                    initialData={profile}
                    academicYears={academicYears}
                    userRole={session.user.role}
                    hasStudents={teacherHasStudents}
                />
            ),
        },
        {
            id: "security",
            label: (
                <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>ความปลอดภัย</span>
                </div>
            ),
            content: <SecuritySettingsForm />,
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-6 mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">
                        ตั้งค่าบัญชี
                    </h1>
                    <p className="text-gray-600 mt-2">
                        จัดการข้อมูลส่วนตัวและความปลอดภัยของคุณ
                    </p>
                </div>

                {/* Tabs Content */}
                <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-8">
                    <Tabs tabs={tabs} defaultTab="profile" />
                </div>
            </div>
        </div>
    );
}
