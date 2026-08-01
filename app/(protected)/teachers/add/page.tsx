import { UserPlus } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { PageHeaderCard } from "@/components/ui/PageHeaderCard";
import { requireAuth } from "@/lib/auth/session";
import { getSchoolClasses } from "@/lib/actions/school-setup.actions";
import { getCurrentAcademicYearTerms } from "@/lib/actions/academic-year.actions";
import { getSchoolRoster } from "@/lib/actions/teacher-roster.actions";
import { getMyTeacherInvites } from "@/lib/actions/teacher-invite";
import { TeacherSetupTabs } from "@/components/teacher/TeacherSetupTabs";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTeacherManagementCapabilities } from "@/lib/auth/teacher-management-policy";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

export const metadata: Metadata = {
    title: "จัดการครูและเชิญเข้าระบบ | โครงการครูนางฟ้า",
    description: "เพิ่มห้องเรียน ลงข้อมูลครู และเชิญครูเข้าใช้งานระบบ",
};

export default async function AddTeacherPage() {
    const session = await requireAuth();
    const capabilities = getTeacherManagementCapabilities(session.user);

    if (!capabilities.canViewTeacherManagement) {
        redirect("/dashboard");
    }

    const [classes, academicYearsResult, roster, inviteResult] = await Promise.all([
        getSchoolClasses(),
        getCurrentAcademicYearTerms(),
        getSchoolRoster(),
        getMyTeacherInvites(),
    ]);
    if (academicYearsResult.status === "transient_error") {
        return (
            <QueryErrorState
                requestId={academicYearsResult.requestId}
                message={academicYearsResult.message}
            />
        );
    }
    if (
        academicYearsResult.status === "forbidden" ||
        academicYearsResult.status === "not_found"
    ) {
        return (
            <p role="alert" className="py-10 text-center text-slate-700">
                ไม่มีสิทธิ์เข้าถึงข้อมูลปีการศึกษา
            </p>
        );
    }
    const academicYears = academicYearsResult.data;

    return (
        <div className="min-h-screen bg-emerald-50 py-6 px-4 relative overflow-hidden">
            <div className="relative z-10 mx-auto max-w-4xl">
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
                    academicYears={academicYears}
                    roster={roster}
                    invites={inviteResult.invites}
                    capabilities={capabilities}
                />
            </div>
        </div>
    );
}
