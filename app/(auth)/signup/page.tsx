import { SignUpForm } from "@/components/auth/SignUpForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ลงทะเบียน | โครงการครูนางฟ้า",
    description: "สร้างบัญชีใหม่",
};

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-rose-50 via-white to-pink-100 relative overflow-hidden px-4">
            {/* Decorative Background Elements */}
            <div className="absolute top-20 right-10 w-72 h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse delay-75" />
            <div className="absolute bottom-20 left-10 w-72 h-72 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse delay-150" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />

            <div className="max-w-md w-full space-y-8 relative z-10">
                <div className="text-center">
                    <div className="mb-4 inline-block p-4 rounded-full bg-white/80 backdrop-blur-sm shadow-sm ring-1 ring-pink-100">
                        <span className="text-4xl filter drop-shadow-sm">
                            🧚‍♀️
                        </span>
                    </div>
                    <h1 className="text-4xl font-bold bg-linear-to-r from-rose-400 to-pink-600 bg-clip-text text-transparent drop-shadow-sm">
                        Krunangfah
                    </h1>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">
                        ลงทะเบียน
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        สร้างบัญชีครูนางฟ้าเพื่อเข้าใช้งาน
                    </p>
                </div>

                <div className="bg-linear-to-b from-white/95 to-pink-50/90 backdrop-blur-xl py-8 px-6 shadow-2xl shadow-pink-200/40 rounded-3xl border border-white/60 ring-1 ring-pink-100/50">
                    <SignUpForm />

                    <div className="mt-6 text-center">
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
            </div>
        </div>
    );
}
