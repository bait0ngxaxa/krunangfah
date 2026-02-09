import { SignInForm } from "@/components/auth/SignInForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "เข้าสู่ระบบ | Krunangfah",
    description: "Sign in to your account",
};

export default async function SignInPage({
    searchParams,
}: {
    searchParams: Promise<{ callbackUrl?: string }>;
}) {
    const { callbackUrl } = await searchParams;

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
                        เข้าสู่ระบบ
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        ยินดีต้อนรับกลับมาค่ะ กรุณาเข้าสู่ระบบ
                    </p>
                </div>

                <div className="bg-linear-to-b from-white/95 to-pink-50/90 backdrop-blur-xl py-8 px-6 shadow-2xl shadow-pink-200/40 rounded-3xl border border-white/60 ring-1 ring-pink-100/50">
                    <SignInForm callbackUrl={callbackUrl} />

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            ยังไม่มีบัญชี?{" "}
                            <Link
                                href="/signup"
                                className="font-semibold text-pink-500 hover:text-pink-600 transition-colors"
                            >
                                ลงทะเบียน
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
