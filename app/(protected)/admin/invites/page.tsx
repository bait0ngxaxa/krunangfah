import { Link2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { requireAdmin } from "@/lib/session";
import { getSchoolAdminInvites } from "@/lib/actions/school-admin-invite.actions";
import { InviteManager } from "@/components/admin/invite/InviteManager";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "จัดการคำเชิญ Admin | โครงการครูนางฟ้า",
    description: "สร้างและจัดการ invite link สำหรับ Admin",
};

export default async function AdminInvitesPage() {
    await requireAdmin();
    const invites = await getSchoolAdminInvites();

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 py-6 px-4 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />

                {/* Header */}
                <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 border border-emerald-200 ring-1 ring-emerald-50 p-5 sm:p-6 mb-8 overflow-hidden group">
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-emerald-400 via-teal-400 to-emerald-300 opacity-60" />
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-linear-to-br from-emerald-200/20 to-teal-300/15 rounded-full blur-xl pointer-events-none" />

                    <div className="relative flex items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                            <div className="relative w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                                <Link2 className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                                <span className="bg-linear-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                                    จัดการคำเชิญ Admin
                                </span>
                            </h1>
                            <p className="text-sm text-gray-500 truncate">
                                สร้าง invite link สำหรับ System Admin หรือ
                                School Admin
                            </p>
                        </div>
                    </div>
                </div>

                <InviteManager invites={invites} />
            </div>
        </div>
    );
}
