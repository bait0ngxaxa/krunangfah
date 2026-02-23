import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import { NavbarGreenBar } from "@/components/layout/NavbarGreenBar";

export const metadata: Metadata = {
    title: "ตั้งรหัสผ่านใหม่ | โครงการครูนางฟ้า",
    description: "กรอกรหัสผ่านใหม่เพื่อเข้าใช้งานระบบ",
};

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token } = await searchParams;

    return (
        <div className="relative min-h-dvh flex flex-col overflow-hidden">
            {/* Background image — grass/flowers */}
            <Image
                src="/image/login_bg.png"
                alt=""
                fill
                className="object-cover object-bottom"
                priority
            />

            {/* ─── Green Navbar ─── */}
            <NavbarGreenBar>
                {/* หน้าหลัก */}
                <div className="ml-auto pr-4 sm:pr-12 lg:pr-[131px] flex items-center shrink-0">
                    <Link
                        href="/"
                        className="text-white hover:opacity-80 transition-opacity font-medium whitespace-nowrap text-base sm:text-lg lg:text-xl"
                    >
                        หน้าหลัก
                    </Link>
                </div>
            </NavbarGreenBar>

            {/* ─── Content ─── */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 -mt-8">
                {/* Logo badge */}
                <div className="mb-5 sm:mb-6">
                    <div className="bg-white rounded-2xl shadow-md overflow-hidden inline-flex items-center">
                        <Image
                            src="/image/homepage/icon 1.png"
                            alt="ครูนางฟ้า"
                            width={240}
                            height={90}
                            className="h-20 sm:h-24 w-auto object-contain"
                        />
                    </div>
                </div>

                <div className="w-full max-w-sm bg-white/90 backdrop-blur-sm rounded-3xl border-2 border-emerald-200 shadow-lg px-6 sm:px-8 py-7 sm:py-8 text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-emerald-800 mb-2">
                        ตั้งรหัสผ่านใหม่
                    </h2>
                    <p className="text-sm text-gray-600 mb-6">
                        กรุณากรอกรหัสผ่านใหม่ของคุณ
                    </p>

                    {token ? (
                        <ResetPasswordForm token={token} />
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                ลิงก์ไม่ถูกต้อง
                            </h3>
                            <p className="text-sm text-gray-600">
                                ไม่พบโทเค็นสำหรับรีเซ็ตรหัสผ่าน กรุณาขอลิงก์ใหม่
                            </p>
                            <Link
                                href="/forgot-password"
                                className="inline-block mt-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                                ขอลิงก์รีเซ็ตรหัสผ่านใหม่
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
