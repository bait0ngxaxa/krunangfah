import { Link2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { PageHeaderCard } from "@/components/ui/PageHeaderCard";
import { requireAuth } from "@/lib/auth/session";
import { getSchoolAdminInvites } from "@/lib/actions/school-admin-invite.actions";
import { InviteManager } from "@/components/admin/invite/InviteManager";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "จัดการคำเชิญแอดมิน | โครงการครูนางฟ้า",
    description: "สร้างและจัดการลิงก์คำเชิญสำหรับแอดมิน",
};

export default async function AdminInvitesPage() {
    const session = await requireAuth();

    if (session.user.role !== "system_admin") {
        redirect("/dashboard");
    }

    const invites = await getSchoolAdminInvites();

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 px-4 py-6">
            <div className="mx-auto max-w-4xl">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />

                <PageHeaderCard
                    icon={Link2}
                    title="จัดการคำเชิญแอดมิน"
                    description="สร้างลิงก์คำเชิญสำหรับแอดมินระบบหรือแอดมินโรงเรียน"
                    variant="neutral"
                    className="mb-8"
                />

                <InviteManager invites={invites} />
            </div>
        </div>
    );
}
