import { SignUpForm } from "@/components/auth/SignUpForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ลงทะเบียน | โครงการครูนางฟ้า",
    description: "สร้างบัญชีใหม่",
};

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 relative overflow-hidden px-4">
            {/* Decorative Background Elements */}
            <div className="absolute top-20 right-10 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-pulse delay-75" />
            <div className="absolute bottom-20 left-10 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-pulse delay-150" />

            <div className="max-w-md w-full space-y-8 relative z-10">
                <div className="text-center">
                    <div className="mb-4 inline-block p-3 rounded-full bg-white/50 backdrop-blur-xs shadow-sm">
                        <span className="text-3xl">🧚‍♀️</span>
                    </div>
                    <h1 className="text-4xl font-bold bg-linear-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                        โครงการครูนางฟ้า
                    </h1>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">
                        ลงทะเบียน
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        สร้างบัญชีครูนางฟ้าเพื่อเข้าใช้งาน
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur-md py-8 px-6 shadow-xl rounded-2xl border border-white/50">
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
