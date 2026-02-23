import { LayoutGrid } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { requireAuth } from "@/lib/session";
import { getSchoolClasses } from "@/lib/actions/school-setup.actions";
import { getSchoolRoster } from "@/lib/actions/teacher-roster.actions";
import { getSchoolAdmins } from "@/lib/actions/primary-admin.actions";
import { SchoolClassesTabs } from "@/components/school/SchoolClassesTabs";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "จัดการห้องเรียนและครู | โครงการครูนางฟ้า",
    description: "เพิ่มและจัดการห้องเรียนและรายชื่อครูของโรงเรียน",
};

export default async function SchoolClassesPage() {
    // (protected)/layout.tsx already guarantees schoolId + teacher profile exist
    const session = await requireAuth();
    const isPrimary = session.user.isPrimary === true;

    const [classes, roster, schoolAdmins] = await Promise.all([
        getSchoolClasses(),
        getSchoolRoster(),
        isPrimary ? getSchoolAdmins() : Promise.resolve([]),
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
                                <LayoutGrid className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold">
                                <span className="text-emerald-600">
                                    จัดการห้องเรียนและครู
                                </span>
                            </h1>
                            <p className="text-sm text-gray-500">
                                {isPrimary
                                    ? "เพิ่ม / ลบห้องเรียน และจัดการรายชื่อครูของโรงเรียน"
                                    : "ดูข้อมูลห้องเรียนและรายชื่อครูของโรงเรียน (อ่านอย่างเดียว)"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabbed Content */}
                <SchoolClassesTabs
                    classes={classes}
                    roster={roster}
                    schoolAdmins={schoolAdmins}
                    isPrimary={isPrimary}
                    currentUserId={session.user.id}
                />
            </div>
        </div>
    );
}
