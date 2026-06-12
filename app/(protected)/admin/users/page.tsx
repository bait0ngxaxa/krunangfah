import { UsersRound } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { PageHeaderCard } from "@/components/ui/PageHeaderCard";
import { requireAuth } from "@/lib/session";
import { getUsers } from "@/lib/actions/user-management.actions";
import { getSchools } from "@/lib/actions/dashboard.actions";
import { UserManagement } from "@/components/admin/users/UserManagement";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "จัดการผู้ใช้งาน | โครงการครูนางฟ้า",
    description: "ดูข้อมูลผู้ใช้ในระบบ",
};

export default async function AdminUsersPage() {
    const session = await requireAuth();

    if (session.user.role !== "system_admin") {
        redirect("/dashboard");
    }

    const [initialData, schools] = await Promise.all([
        getUsers(),
        getSchools(),
    ]);

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 px-4 py-6">
            <div className="mx-auto max-w-4xl">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />

                <PageHeaderCard
                    icon={UsersRound}
                    title="จัดการผู้ใช้งาน"
                    description="ดูข้อมูลผู้ใช้ทั้งหมดในระบบ"
                    variant="neutral"
                    className="mb-8"
                />

                <UserManagement initialData={initialData} schools={schools} />
            </div>
        </div>
    );
}
