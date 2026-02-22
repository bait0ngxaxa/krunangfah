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
                                <Link2 className="w-6 h-6 text-white stroke-[2.5]" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                                จัดการคำเชิญ Admin
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
