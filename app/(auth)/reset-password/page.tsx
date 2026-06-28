import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { AuthBackgroundImage } from "@/components/auth/AuthBackgroundImage";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import { NavbarGreenBar } from "@/components/layout/NavbarGreenBar";
import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AUTH_CARD_CLASS, AUTH_HOME_LINK_CLASS, AUTH_TEXT_LINK_CLASS } from "@/components/auth/authStyles";

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
    const session = await getServerSession();

    if (session?.user) {
        redirect("/dashboard");
    }

    return (
        <div className="relative flex min-h-dvh flex-col overflow-x-hidden">
            {/* Background image — grass/flowers */}
            <AuthBackgroundImage />

            {/* ─── Green Navbar ─── */}
            <NavbarGreenBar>
                {/* หน้าหลัก */}
                <div className="ml-auto pr-4 sm:pr-12 lg:pr-[131px] flex items-center shrink-0">
                    <Link
                        href="/"
                        className={AUTH_HOME_LINK_CLASS}
                    >
                        หน้าหลัก
                    </Link>
                </div>
            </NavbarGreenBar>

            {/* ─── Content ─── */}
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-10">
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

                <div className={`${AUTH_CARD_CLASS} text-center`}>
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
                                <AlertTriangle
                                    className="w-8 h-8 text-red-500"
                                    aria-hidden="true"
                                />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                ลิงก์ไม่ถูกต้อง
                            </h3>
                            <p className="text-sm leading-6 text-gray-600">
                                ไม่พบโทเค็นสำหรับรีเซ็ตรหัสผ่าน กรุณาขอลิงก์ใหม่
                            </p>
                            <Link
                                href="/forgot-password"
                                className={`mt-2 inline-block ${AUTH_TEXT_LINK_CLASS}`}
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
