import { LayoutGrid, Users } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { requireAuth } from "@/lib/session";
import { getSchoolClasses } from "@/lib/actions/school-setup.actions";
import { getSchoolRoster } from "@/lib/actions/teacher-roster.actions";
import { ClassListEditor } from "@/components/school/ClassListEditor";
import { TeacherRosterEditor } from "@/components/school/TeacherRosterEditor";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "จัดการห้องเรียนและครู | โครงการครูนางฟ้า",
    description: "เพิ่มและจัดการห้องเรียนและรายชื่อครูของโรงเรียน",
};

export default async function SchoolClassesPage() {
    // (protected)/layout.tsx already guarantees schoolId + teacher profile exist
    const session = await requireAuth();
    const isPrimary = session.user.isPrimary === true;

    const [classes, roster] = await Promise.all([
        getSchoolClasses(),
        getSchoolRoster(),
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

                {/* Section: Classes */}
                <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8 border-2 border-emerald-100 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-[#0BD0D9] flex items-center justify-center shadow-sm">
                            <LayoutGrid className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">
                                ห้องเรียน
                            </h2>
                            <p className="text-xs text-gray-400">
                                {classes.length} ห้อง — ใช้เป็น dropdown
                                เมื่อเชิญครู
                            </p>
                        </div>
                    </div>
                    <ClassListEditor
                        initialClasses={classes}
                        readOnly={!isPrimary}
                    />
                </div>

                {/* Section: Teacher Roster */}
                <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8 border-2 border-emerald-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-[#0BD0D9] flex items-center justify-center shadow-sm">
                            <Users className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">
                                รายชื่อครู
                            </h2>
                            <p className="text-xs text-gray-400">
                                {roster.length} คน —
                                ลงข้อมูลไว้ล่วงหน้าเพื่อใช้ตอน invite
                            </p>
                        </div>
                    </div>
                    <TeacherRosterEditor
                        initialRoster={roster}
                        schoolClasses={classes}
                        readOnly={!isPrimary}
                    />
                </div>
            </div>
        </div>
    );
}
