import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BackButton } from "@/components/ui/BackButton";
import { PageHeaderCard } from "@/components/ui/PageHeaderCard";
import { requireAuth } from "@/lib/auth/session";
import { SystemOperationsCenter } from "@/components/admin/system/SystemOperationsCenter";

export const metadata: Metadata = {
    title: "ศูนย์ดูแลระบบ | โครงการครูนางฟ้า",
    description: "ค้นหาและดูแลข้อมูลหลักสำหรับ System Admin",
};

export default async function SystemOperationsPage() {
    const session = await requireAuth();
    if (session.user.role !== "system_admin") {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 px-4 py-6">
            <div className="mx-auto max-w-[1600px]">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />
                <PageHeaderCard
                    icon={ShieldCheck}
                    title="ศูนย์ดูแลระบบ"
                    description="ค้นหาโรงเรียน ผู้ใช้งาน ครู และนักเรียนจากจุดเดียว ก่อนเข้า workflow จัดการข้อมูลเดิม"
                    variant="neutral"
                    className="mb-6"
                />
                <SystemOperationsCenter />
            </div>
        </div>
    );
}
