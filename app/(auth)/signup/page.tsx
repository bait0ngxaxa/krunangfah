import { SignUpForm } from "@/components/auth/SignUpForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ลงทะเบียน | โครงการครูนางฟ้า",
    description: "สร้างบัญชีใหม่",
};

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-cyan-50 px-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        โครงการครูนางฟ้า
                    </h1>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        ลงทะเบียน
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        สร้างบัญชีครูนางฟ้าเพื่อเข้าใช้งาน
                    </p>
                </div>

                <div className="mt-8 bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
                    <SignUpForm />

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            มีบัญชีอยู่แล้ว?{" "}
                            <Link
                                href="/signin"
                                className="font-medium text-blue-600 hover:text-blue-500"
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
