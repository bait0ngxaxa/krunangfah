import { UsersRound } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { PageHeaderCard } from "@/components/ui/PageHeaderCard";
import { requireAuth } from "@/lib/auth/session";
import { getSchoolClasses } from "@/lib/actions/school-setup.actions";
import { getSchoolAdmins } from "@/lib/actions/primary-admin.actions";
import { getSchoolTeachers } from "@/lib/actions/user-management.actions";
import { SchoolClassesTabs } from "@/components/school/SchoolClassesTabs";
import { QueryErrorState } from "@/components/ui/QueryErrorState";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "จัดการครูในระบบ | โครงการครูนางฟ้า",
    description: "ดูครูที่ลงทะเบียนแล้ว แก้ไขห้องที่ปรึกษา และจัดการสิทธิ์ผู้ดูแล",
};

export default async function SchoolClassesPage() {
    const session = await requireAuth();
    const isPrimary = session.user.isPrimary === true;

    // Only primary admins should see this page
    const [classesResult, schoolAdmins, registeredTeachers] = await Promise.all([
        getSchoolClasses(),
        isPrimary ? getSchoolAdmins() : Promise.resolve([]),
        isPrimary ? getSchoolTeachers() : Promise.resolve([]),
    ]);
    if (classesResult.status === "transient_error") {
        return (
            <QueryErrorState
                requestId={classesResult.requestId}
                message={classesResult.message}
            />
        );
    }
    if (
        classesResult.status === "forbidden" ||
        classesResult.status === "not_found"
    ) {
        redirect("/dashboard");
    }
    const classes = classesResult.data;

    return (
        <div className="min-h-screen bg-emerald-50 py-6 px-4 relative overflow-hidden">
            <div className="max-w-2xl mx-auto relative z-10">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />

                <PageHeaderCard
                    icon={UsersRound}
                    title={<span className="text-emerald-600">จัดการครูในระบบ</span>}
                    description={
                        isPrimary
                            ? "แก้ไขห้องที่ปรึกษา / จัดการสิทธิ์ผู้ดูแล"
                            : "ดูข้อมูลครูในระบบ (อ่านอย่างเดียว)"
                    }
                    variant="neutral"
                    className="mb-8"
                />

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
