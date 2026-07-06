import { DatabaseZap } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BackButton } from "@/components/ui/BackButton";
import { PageHeaderCard } from "@/components/ui/PageHeaderCard";
import { requireAuth } from "@/lib/auth/session";
import { DataManagementCenter } from "@/components/admin/data-management/DataManagementCenter";

export const metadata: Metadata = {
    title: "ศูนย์จัดการข้อมูล | โครงการครูนางฟ้า",
    description: "จัดการข้อมูลเลิกใช้งานและข้อมูลทดสอบ",
};

export default async function DataManagementPage() {
    const session = await requireAuth();
    if (session.user.role !== "system_admin") {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 px-4 py-6">
            <div className="mx-auto max-w-7xl">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />
                <PageHeaderCard
                    icon={DatabaseZap}
                    title="ศูนย์จัดการข้อมูล"
                    description="ค้นหา ตรวจสอบ ปิดใช้งาน กู้คืน และลบถาวรข้อมูลโรงเรียนหรือนักเรียน"
                    variant="neutral"
                    className="mb-6"
                />
                <DataManagementCenter />
            </div>
        </div>
    );
}
