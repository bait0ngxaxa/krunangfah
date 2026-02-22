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
        <div className="min-h-screen bg-emerald-50 py-6 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}

            <div className="max-w-2xl mx-auto relative z-10">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />

                {/* Header */}
                <div className="relative bg-white rounded-2xl shadow-sm border-2 border-emerald-100 p-5 sm:p-6 mb-6 overflow-hidden group">
                    <div className="relative flex items-center gap-4">
                        {/* Animated icon */}
                        <div className="relative shrink-0">
                            <div className="relative w-12 h-12 rounded-2xl bg-[#0BD0D9] flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                                <UserPlus className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                                <span className="text-emerald-600">
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
                <div className="relative bg-white rounded-3xl shadow-sm p-5 sm:p-8 border-2 border-emerald-100 overflow-hidden">
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
