import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getWhitelistEntries } from "@/lib/actions/whitelist.actions";
import { WhitelistManager } from "@/components/admin/WhitelistManager";

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "จัดการรายชื่อผู้ดูแลระบบ | โครงการครูนางฟ้า",
    description: "จัดการรายชื่ออีเมลที่มีสิทธิ์เป็นผู้ดูแลระบบ",
};

export default async function WhitelistPage() {
    await requireAdmin();
    const entries = await getWhitelistEntries();

    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-8 px-4 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-pink-50 px-4 py-2 rounded-full mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold">
                        <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                            จัดการ System Admin Whitelist
                        </span>
                    </h1>
                    <p className="text-gray-500 mt-2 font-semibold">
                        อีเมลที่อยู่ในรายการนี้จะได้รับสิทธิ์แอดมิน
                        อัตโนมัติเมื่อลงทะเบียน
                    </p>
                </div>

                <WhitelistManager initialEntries={entries} />
            </div>
        </div>
    );
}
