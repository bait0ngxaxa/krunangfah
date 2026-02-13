import { SignUpForm } from "@/components/auth/SignUpForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ลงทะเบียน | โครงการครูนางฟ้า",
    description: "สร้างบัญชีใหม่",
};

export default function SignUpPage() {
    return (
        <div className="min-h-dvh flex items-center justify-center bg-linear-to-br from-rose-50 via-white to-pink-100 relative overflow-hidden px-4 py-8 sm:py-12">
            {/* Decorative Background Elements */}
            <div className="absolute top-10 right-5 sm:top-20 sm:right-10 w-48 h-48 sm:w-72 sm:h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse delay-75" />
            <div className="absolute bottom-10 left-5 sm:bottom-20 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse delay-150" />
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
                        ลงทะเบียน
                    </h2>
                    <p className="mt-1.5 sm:mt-2 text-sm text-gray-600">
                        สร้างบัญชีครูนางฟ้าเพื่อเข้าใช้งาน
                    </p>
                </div>

                <div className="bg-linear-to-b from-white/95 to-pink-50/90 backdrop-blur-xl py-6 px-5 sm:py-8 sm:px-6 shadow-2xl shadow-pink-200/40 rounded-2xl sm:rounded-3xl border border-white/60 ring-1 ring-pink-100/50">
                    <SignUpForm />

                    <div className="mt-5 sm:mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            มีบัญชีอยู่แล้ว?{" "}
                            <Link
                                href="/signin"
                                className="font-semibold text-pink-500 hover:text-pink-600 transition-colors"
                            >
                                เข้าสู่ระบบ
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} Kru Nangfah Project
                </p>
            </div>
        </div>
    );
}
