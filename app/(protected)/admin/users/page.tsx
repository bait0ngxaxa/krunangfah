import { UsersRound } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { PageHeaderCard } from "@/components/ui/PageHeaderCard";
import { requireAdmin } from "@/lib/session";
import { getUsers } from "@/lib/actions/user-management.actions";
import { getSchools } from "@/lib/actions/dashboard.actions";
import { UserManagement } from "@/components/admin/users/UserManagement";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "จัดการผู้ใช้งาน | โครงการครูนางฟ้า",
    description: "ดูข้อมูลผู้ใช้ในระบบ",
};

export default async function AdminUsersPage() {
    await requireAdmin();

    const [initialData, schools] = await Promise.all([
        getUsers(),
        getSchools(),
    ]);

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 py-6 px-4 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--brand-primary)] rounded-full mix-blend-multiply filter blur-3xl opacity-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#34D399] rounded-full mix-blend-multiply filter blur-3xl opacity-10 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />

                <PageHeaderCard
                    icon={UsersRound}
                    title="จัดการผู้ใช้งาน"
                    description="ดูข้อมูลผู้ใช้ทั้งหมดในระบบ"
                    className="mb-8"
                />

                <UserManagement initialData={initialData} schools={schools} />
            </div>
        </div>
    );
}
