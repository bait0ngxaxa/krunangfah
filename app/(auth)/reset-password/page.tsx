import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "รีเซ็ตรหัสผ่าน | Krunangfah",
    description: "Set a new password",
};

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token } = await searchParams;

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-rose-50 via-white to-pink-100 relative overflow-hidden px-4">
            {/* Decorative Background Elements */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse delay-75" />
            <div className="absolute bottom-20 right-10 w-72 h-72 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse delay-150" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />

            <div className="max-w-md w-full space-y-8 relative z-10">
                <div className="text-center">
                    <div className="relative mb-6 group cursor-default inline-block">
                        <div className="absolute -inset-4 bg-linear-to-r from-rose-300/50 to-pink-300/50 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="relative bg-white/60 backdrop-blur-xl p-4 rounded-3xl shadow-lg ring-1 ring-white/60 transform transition-transform duration-500 hover:scale-110 hover:rotate-12">
                            <span className="text-5xl filter drop-shadow-sm select-none animate-bounce-subtle">
                                🧚‍♀️
                            </span>
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold bg-linear-to-r from-rose-400 to-pink-600 bg-clip-text text-transparent drop-shadow-sm">
                        Krunangfah
                    </h1>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">
                        ตั้งรหัสผ่านใหม่
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        กรุณากรอกรหัสผ่านใหม่ของคุณ
                    </p>
                </div>

                <div className="bg-linear-to-b from-white/95 to-pink-50/90 backdrop-blur-xl py-8 px-6 shadow-2xl shadow-pink-200/40 rounded-3xl border border-white/60 ring-1 ring-pink-100/50">
                    {token ? (
                        <ResetPasswordForm token={token} />
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                                <svg
                                    className="w-8 h-8 text-red-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                ลิงก์ไม่ถูกต้อง
                            </h3>
                            <p className="text-sm text-gray-600">
                                ไม่พบโทเค็นสำหรับรีเซ็ตรหัสผ่าน กรุณาขอลิงก์ใหม่
                            </p>
                            <Link
                                href="/forgot-password"
                                className="inline-block mt-2 text-sm font-semibold text-pink-500 hover:text-pink-600 transition-colors"
                            >
                                ขอลิงก์รีเซ็ตรหัสผ่านใหม่
                            </Link>
                        </div>
                    )}
                </div>

                <p className="text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} Kru Nangfah Project
                </p>
            </div>
        </div>
    );
}
