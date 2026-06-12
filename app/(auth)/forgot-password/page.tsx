import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AuthBackgroundImage } from "@/components/auth/AuthBackgroundImage";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { NavbarGreenBar } from "@/components/layout/NavbarGreenBar";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AUTH_CARD_CLASS, AUTH_HOME_LINK_CLASS } from "@/components/auth/authStyles";

export const metadata: Metadata = {
    title: "ลืมรหัสผ่าน | โครงการครูนางฟ้า",
    description: "กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่",
};

export default async function ForgotPasswordPage() {
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
                        ลืมรหัสผ่าน
                    </h2>
                    <p className="text-sm text-gray-600 mb-6">
                        กรอกอีเมลของคุณ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้
                    </p>
                    <ForgotPasswordForm />
                </div>
            </div>
        </div>
    );
}
