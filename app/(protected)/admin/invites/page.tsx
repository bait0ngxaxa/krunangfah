import { Link2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { PageHeaderCard } from "@/components/ui/PageHeaderCard";
import { requireAuth } from "@/lib/session";
import { getSchoolAdminInvites } from "@/lib/actions/school-admin-invite.actions";
import { InviteManager } from "@/components/admin/invite/InviteManager";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "จัดการคำเชิญ Admin | โครงการครูนางฟ้า",
    description: "สร้างและจัดการ invite link สำหรับ Admin",
};

export default async function AdminInvitesPage() {
    const session = await requireAuth();

    if (session.user.role !== "system_admin") {
        redirect("/dashboard");
    }

    const invites = await getSchoolAdminInvites();

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 py-6 px-4 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--brand-primary)] rounded-full mix-blend-multiply filter blur-3xl opacity-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#34D399] rounded-full mix-blend-multiply filter blur-3xl opacity-10 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />

                <PageHeaderCard
                    icon={Link2}
                    title="จัดการคำเชิญ Admin"
                    description="สร้าง invite link สำหรับ System Admin หรือ School Admin"
                    className="mb-8"
                />

                <InviteManager invites={invites} />
            </div>
        </div>
    );
}
