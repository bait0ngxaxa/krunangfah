import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
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
                <Suspense fallback={<SystemOperationsFallback />}>
                    <SystemOperationsCenter />
                </Suspense>
            </div>
        </div>
    );
}

function SystemOperationsFallback() {
    return (
        <div className="space-y-5" aria-label="กำลังโหลดศูนย์ดูแลระบบ">
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="h-5 w-36 rounded-full bg-emerald-50" />
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                    <div className="h-12 rounded-xl bg-gray-100" />
                    <div className="h-12 rounded-xl bg-gray-100" />
                    <div className="h-12 rounded-xl bg-[var(--brand-primary-soft)]" />
                </div>
            </div>
            <div className="grid gap-5 xl:grid-cols-[minmax(320px,390px)_minmax(0,1fr)]">
                <div className="min-h-80 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm" />
                <div className="min-h-[520px] rounded-2xl border border-dashed border-emerald-200 bg-white/80" />
            </div>
        </div>
    );
}
