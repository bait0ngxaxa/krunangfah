import { UsersRound } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { requireAuth } from "@/lib/session";
import { getSchoolClasses } from "@/lib/actions/school-setup.actions";
import { getSchoolAdmins } from "@/lib/actions/primary-admin.actions";
import { getSchoolTeachers } from "@/lib/actions/user-management.actions";
import { SchoolClassesTabs } from "@/components/school/SchoolClassesTabs";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "จัดการครูในระบบ | โครงการครูนางฟ้า",
    description: "ดูครูที่ลงทะเบียนแล้ว แก้ไขห้องที่ปรึกษา และจัดการสิทธิ์ผู้ดูแล",
};

export default async function SchoolClassesPage() {
    const session = await requireAuth();
    const isPrimary = session.user.isPrimary === true;

    // Only primary admins should see this page
    const [classes, schoolAdmins, registeredTeachers] = await Promise.all([
        getSchoolClasses(),
        isPrimary ? getSchoolAdmins() : Promise.resolve([]),
        isPrimary ? getSchoolTeachers() : Promise.resolve([]),
    ]);

    return (
        <div className="min-h-screen bg-emerald-50 py-6 px-4 relative overflow-hidden">
            <div className="max-w-2xl mx-auto relative z-10">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />

                {/* Header */}
                <div className="relative bg-white rounded-2xl shadow-sm border-2 border-emerald-100 p-5 sm:p-6 mb-8 overflow-hidden group">
                    <div className="relative flex items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="relative w-12 h-12 rounded-2xl bg-[#0BD0D9] flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                                <UsersRound className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold">
                                <span className="text-emerald-600">
                                    จัดการครูในระบบ
                                </span>
                            </h1>
                            <p className="text-sm text-gray-500">
                                {isPrimary
                                    ? "แก้ไขห้องที่ปรึกษา / จัดการสิทธิ์ผู้ดูแล"
                                    : "ดูข้อมูลครูในระบบ (อ่านอย่างเดียว)"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabbed Content */}
                <SchoolClassesTabs
                    classes={classes}
                    schoolAdmins={schoolAdmins}
                    registeredTeachers={registeredTeachers}
                    currentUserId={session.user.id}
                />
            </div>
        </div>
    );
}
