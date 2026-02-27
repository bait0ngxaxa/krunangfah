import { UserPlus } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { requireAuth } from "@/lib/session";
import { getAcademicYears } from "@/lib/actions/teacher.actions";
import { getSchoolClasses } from "@/lib/actions/school-setup.actions";
import { getSchoolRoster } from "@/lib/actions/teacher-roster.actions";
import { getMyTeacherInvites } from "@/lib/actions/teacher-invite";
import { TeacherSetupTabs } from "@/components/teacher/TeacherSetupTabs";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "จัดการครูและเชิญเข้าระบบ | โครงการครูนางฟ้า",
    description: "เพิ่มห้องเรียน ลงข้อมูลครู และเชิญครูเข้าใช้งานระบบ",
};

export default async function AddTeacherPage() {
    const session = await requireAuth();
    const isPrimary = session.user.isPrimary === true;

    const [academicYears, classes, roster, inviteResult] = await Promise.all([
        getAcademicYears(),
        getSchoolClasses(),
        getSchoolRoster(),
        getMyTeacherInvites(),
    ]);

    return (
        <div className="min-h-screen bg-emerald-50 py-6 px-4 relative overflow-hidden">
            <div className="max-w-2xl mx-auto relative z-10">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />

                {/* Header */}
                <div className="relative bg-white rounded-2xl shadow-sm border-2 border-emerald-100 p-5 sm:p-6 mb-6 overflow-hidden group">
                    <div className="relative flex items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="relative w-12 h-12 rounded-2xl bg-[#0BD0D9] flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                                <UserPlus className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold">
                                <span className="text-emerald-600">
                                    จัดการครูและเชิญเข้าระบบ
                                </span>
                            </h1>
                            <p className="text-sm text-gray-500">
                                เพิ่มห้องเรียน / ลงข้อมูลครู / สร้างลิงก์เชิญ
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabbed Content */}
                <TeacherSetupTabs
                    classes={classes}
                    roster={roster}
                    academicYears={academicYears}
                    invites={inviteResult.invites}
                    isPrimary={isPrimary}
                />
            </div>
        </div>
    );
}
