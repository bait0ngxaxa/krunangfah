import { XCircle } from "lucide-react";
import Link from "next/link";
import { validateInviteToken } from "@/lib/actions/school-admin-invite.actions";
import { InviteRegisterForm } from "@/components/auth/InviteRegisterForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ลงทะเบียน School Admin | โครงการครูนางฟ้า",
    description: "สร้างบัญชีเพื่อเข้าใช้งานระบบในฐานะ School Admin",
};

interface AdminInvitePageProps {
    params: Promise<{ token: string }>;
}

export default async function AdminInvitePage({
    params,
}: AdminInvitePageProps) {
    const { token } = await params;

    let email: string;
    let errorMessage: string | null = null;

    try {
        const result = await validateInviteToken(token);
        email = result.email;
    } catch (error) {
        errorMessage =
            error instanceof Error
                ? error.message
                : "ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว";
        email = "";
    }

    if (errorMessage) {
        return (
            <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-100 flex items-center justify-center py-8 px-4">
                <div className="max-w-md w-full bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-pink-200 p-8 text-center">
                    <div className="mb-4 flex justify-center">
                        <XCircle className="w-16 h-16 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-3">
                        ลิงก์ไม่ถูกต้อง
                    </h1>
                    <p className="text-gray-600 mb-6">{errorMessage}</p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-linear-to-r from-rose-400 to-pink-500 text-white rounded-xl font-semibold hover:from-rose-500 hover:to-pink-600 transition-all shadow-md"
                    >
                        กลับหน้าหลัก
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh flex items-center justify-center bg-linear-to-br from-rose-50 via-white to-pink-100 relative overflow-hidden px-4 py-8 sm:py-12">
            {/* Decorative Background */}
            <div className="absolute top-10 left-5 sm:top-20 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse delay-75" />
            <div className="absolute bottom-10 right-5 sm:bottom-20 sm:right-10 w-48 h-48 sm:w-72 sm:h-72 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse delay-150" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-96 sm:h-96 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />

            <div className="w-full max-w-[min(28rem,100%)] space-y-6 sm:space-y-8 relative z-10">
                <div className="text-center">
                    <div className="relative mb-4 sm:mb-6 group cursor-default inline-block">
                        <div className="absolute -inset-4 bg-linear-to-r from-rose-300/50 to-pink-300/50 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="relative bg-white/60 backdrop-blur-xl p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-lg ring-1 ring-white/60 transform transition-transform duration-500 hover:scale-110 hover:rotate-12">
                            <span className="text-4xl sm:text-5xl drop-shadow-sm select-none animate-fairy-fly">
                                🧚‍♀️
                            </span>
                        </div>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-rose-400 to-pink-600 bg-clip-text text-transparent drop-shadow-sm">
                        Krunangfah
                    </h1>
                    <div className="flex items-center justify-center gap-3 mt-2 sm:mt-3">
                        <span className="sparkle-dot" />
                        <div className="h-px w-10 sm:w-12 bg-linear-to-r from-transparent via-pink-300 to-transparent" />
                        <span className="sparkle-dot" />
                        <div className="h-px w-10 sm:w-12 bg-linear-to-r from-transparent via-rose-300 to-transparent" />
                        <span className="sparkle-dot" />
                    </div>
                    <h2 className="mt-3 sm:mt-4 text-xl sm:text-2xl font-bold text-gray-900">
                        สร้างบัญชี School Admin
                    </h2>
                    <p className="mt-1.5 sm:mt-2 text-sm text-gray-600">
                        คุณได้รับคำเชิญให้เข้าร่วมระบบ กรุณาตั้งรหัสผ่าน
                    </p>
                </div>

                <div className="bg-linear-to-b from-white/95 to-pink-50/90 backdrop-blur-xl py-6 px-5 sm:py-8 sm:px-6 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08),0_8px_32px_-8px_rgba(244,114,182,0.2)] rounded-2xl sm:rounded-3xl border border-pink-200 ring-1 ring-white/80">
                    <InviteRegisterForm token={token} email={email} />
                </div>

                <p className="text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} Kru Nangfah Project
                </p>
            </div>
        </div>
    );
}
