import { Shield } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";

import { requireAdmin } from "@/lib/session";
import { getWhitelistEntries } from "@/lib/actions/whitelist.actions";
import { WhitelistManager } from "@/components/admin/WhitelistManager";

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "จัดการรายชื่อผู้ดูแลระบบ | โครงการครูนางฟ้า",
    description: "จัดการรายชื่ออีเมลที่มีสิทธิ์เป็นผู้ดูแลระบบ",
};

export default async function WhitelistPage() {
    const session = await requireAdmin();
    const entries = await getWhitelistEntries();

    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-6 px-4 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <BackButton href="/dashboard" label="กลับหน้าหลัก" />

                {/* Header */}
                <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-pink-200 ring-1 ring-pink-50 p-5 sm:p-6 mb-8 overflow-hidden group">
                    {/* Gradient accent bottom border */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-400 via-pink-400 to-rose-300 opacity-60" />
                    {/* Top shimmer */}
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-linear-to-br from-rose-200/20 to-pink-300/15 rounded-full blur-xl pointer-events-none" />

                    <div className="relative flex items-center gap-4">
                        {/* Animated icon */}
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                            <div className="relative w-12 h-12 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-200/50 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                                <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                                    จัดการ System Admin Whitelist
                                </span>
                            </h1>
                            <p className="text-sm text-gray-500 truncate">
                                อีเมลที่อยู่ในรายการนี้จะได้รับสิทธิ์แอดมินอัตโนมัติเมื่อลงทะเบียน
                            </p>
                        </div>
                    </div>
                </div>

                <WhitelistManager initialEntries={entries} currentUserEmail={session.user.email ?? ""} />
            </div>
        </div>
    );
}
