import { UsersRound } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
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
            <div className="absolute top-0 left-0 w-96 h-96 bg-[#0BD0D9] rounded-full mix-blend-multiply filter blur-3xl opacity-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#34D399] rounded-full mix-blend-multiply filter blur-3xl opacity-10 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />

                {/* Header */}
                <div className="relative bg-white rounded-4xl border-2 border-[#0BD0D9] shadow-sm p-5 sm:p-6 mb-8 overflow-hidden group">
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#0BD0D9]/10 rounded-full blur-xl pointer-events-none" />

                    <div className="relative flex items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-2xl bg-[#0BD0D9] flex items-center justify-center shadow-md group-hover:-translate-y-1 transition-transform duration-300">
                                <UsersRound className="w-6 h-6 text-white stroke-[2.5]" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                                จัดการผู้ใช้งาน
                            </h1>
                            <p className="text-sm text-gray-500 truncate">
                                ดูข้อมูลผู้ใช้ทั้งหมดในระบบ
                            </p>
                        </div>
                    </div>
                </div>

                <UserManagement initialData={initialData} schools={schools} />
            </div>
        </div>
    );
}
