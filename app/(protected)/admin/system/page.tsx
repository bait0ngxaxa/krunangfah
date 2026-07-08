import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BackButton } from "@/components/ui/BackButton";
import { PageHeaderCard } from "@/components/ui/PageHeaderCard";
import { requireAuth } from "@/lib/auth/session";
import { SystemOperationsCenter } from "@/components/admin/system/SystemOperationsCenter";

export const metadata: Metadata = {
    title: "ศูนย์ดูแลระบบ | โครงการครูนางฟ้า",
    description: "ค้นหาและดูแลข้อมูลหลักสำหรับผู้ดูแลระบบ",
};

export default async function SystemOperationsPage() {
    const session = await requireAuth();
    if (session.user.role !== "system_admin") {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1520px] space-y-6">
                <div>
                    <BackButton href="/dashboard" label="กลับหน้าหลัก" />
                </div>
                <PageHeaderCard
                    icon={ShieldCheck}
                    title="ศูนย์ดูแลระบบ"
                    description="ค้นหาโรงเรียน บุคลากร และนักเรียนจากจุดเดียว แล้วจัดการข้อมูลต่อได้ทันที"
                    variant="neutral"
                />
                <SystemOperationsCenter />
            </div>
        </div>
    );
}
