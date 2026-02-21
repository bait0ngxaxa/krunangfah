import { requireAuth } from "@/lib/session";
import { AddTeacherForm } from "@/components/teacher";
import { getAcademicYears } from "@/lib/actions/teacher.actions";
import { getSchoolRoster } from "@/lib/actions/teacher-roster.actions";
import { UserPlus, Info } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "เพิ่มครูผู้ดูแล | โครงการครูนางฟ้า",
    description: "เพิ่มครูผู้ดูแลนักเรียน",
};

export default async function AddTeacherPage() {
    await requireAuth();

    const [academicYears, roster] = await Promise.all([
        getAcademicYears(),
        getSchoolRoster(),
    ]);

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 py-6 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 -translate-x-1/3 translate-y-1/3 pointer-events-none" />

            <div className="max-w-2xl mx-auto relative z-10">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />

                {/* Header */}
                <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 border border-emerald-200 ring-1 ring-emerald-50 p-5 sm:p-6 mb-6 overflow-hidden group">
                    {/* Gradient accent bottom border */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-emerald-400 via-teal-400 to-emerald-300 opacity-60" />
                    {/* Top shimmer */}
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-linear-to-br from-emerald-200/20 to-teal-300/15 rounded-full blur-xl pointer-events-none" />

                    <div className="relative flex items-center gap-4">
                        {/* Animated icon */}
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                            <div className="relative w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                                <UserPlus className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                                <span className="bg-linear-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                                    เพิ่มครูผู้ดูแลนักเรียน
                                </span>
                            </h1>
                            <p className="text-sm text-gray-500 truncate">
                                เลือกจากข้อมูลคุณครูในโรงเรียน
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="relative bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-emerald-100/50 p-5 sm:p-8 border border-emerald-200 overflow-hidden ring-1 ring-emerald-50">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-emerald-300 via-teal-300 to-cyan-300" />
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-40 h-40 bg-linear-to-br from-emerald-200/45 to-teal-300/35 rounded-full blur-xl pointer-events-none" />
                    {/* Shimmer */}
                    <div className="absolute inset-x-0 top-[6px] h-px bg-linear-to-r from-transparent via-teal-300/30 to-transparent" />

                    <p className="relative text-gray-600 mb-6 sm:mb-8 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 flex items-start gap-2 text-sm sm:text-base">
                        <Info className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>
                            เลือกครูจากข้อมูลคุณครูในโรงเรียน ระบบจะสร้าง Link
                            สำหรับให้ครูผู้ดูแลใช้ในการตั้งรหัสผ่าน
                        </span>
                    </p>
                    <AddTeacherForm
                        academicYears={academicYears}
                        roster={roster}
                    />
                </div>
            </div>
        </div>
    );
}
