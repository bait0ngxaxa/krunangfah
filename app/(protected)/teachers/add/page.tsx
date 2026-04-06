import { UserPlus } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { PageHeaderCard } from "@/components/ui/PageHeaderCard";
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

                <PageHeaderCard
                    icon={UserPlus}
                    title={
                        <span className="text-emerald-600">
                            จัดการครูและเชิญเข้าระบบ
                        </span>
                    }
                    description="เพิ่ม-ลบห้องเรียน / เพิ่ม-ลบครู / สร้างลิงก์เชิญ"
                    variant="neutral"
                    className="mb-6"
                />

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
