import { getTeacherInvite } from "@/lib/actions/teacher-invite";
import { AcceptInviteForm } from "@/components/teacher/forms/AcceptInviteForm";
import { XCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { AuthBackgroundImage } from "@/components/auth/AuthBackgroundImage";
import { NavbarGreenBar } from "@/components/layout/NavbarGreenBar";
import type { Metadata } from "next";
import {
    AUTH_CARD_CLASS,
    AUTH_ERROR_CARD_CLASS,
    AUTH_HOME_LINK_CLASS,
    AUTH_PRIMARY_BUTTON_CLASS,
} from "@/components/auth/authStyles";

export const metadata: Metadata = {
    title: "ลงทะเบียนครูผู้ดูแล | โครงการครูนางฟ้า",
    description: "ลงทะเบียนเข้าใช้งานระบบ",
};

interface InvitePageProps {
    params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
    const { token } = await params;
    const result = await getTeacherInvite(token);

    if (!result.success || !result.invite) {
        return (
            <div className="relative flex min-h-dvh flex-col overflow-x-hidden">
                <AuthBackgroundImage />

                <NavbarGreenBar>
                    <div className="ml-auto pr-6 sm:pr-12 lg:pr-[131px] flex items-center">
                        <Link
                            href="/"
                            className={AUTH_HOME_LINK_CLASS}
                        >
                            หน้าหลัก
                        </Link>
                    </div>
                </NavbarGreenBar>

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-8 sm:pt-12 pb-8">
                    <div className={AUTH_ERROR_CARD_CLASS}>
                        <div className="mb-4 flex justify-center">
                            <XCircle
                                className="w-16 h-16 text-red-400"
                                aria-hidden="true"
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-3">
                            ลิงก์ไม่ถูกต้อง
                        </h1>
                        <p className="mb-6 break-words text-gray-600">
                            {result.message}
                        </p>
                        <Link
                            href="/"
                            className={AUTH_PRIMARY_BUTTON_CLASS}
                        >
                            กลับหน้าหลัก
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-dvh flex-col overflow-x-hidden">
            {/* Background image — grass/flowers */}
            <AuthBackgroundImage />

            {/* ─── Green Navbar ─── */}
            <NavbarGreenBar>
                {/* หน้าหลัก */}
                <div className="ml-auto pr-6 sm:pr-12 lg:pr-[131px] flex items-center">
                    <Link
                        href="/"
                        className={AUTH_HOME_LINK_CLASS}
                    >
                        หน้าหลัก
                    </Link>
                </div>
            </NavbarGreenBar>

            {/* ─── Content ─── */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-8 sm:pt-12 pb-8">
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

                {/* Info Text */}
                <div className="text-center mb-6">
                    <div className="bg-white/70 backdrop-blur-sm px-6 py-4 rounded-2xl inline-block shadow-sm border border-gray-100">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">
                            สร้างบัญชีครูนางฟ้า
                        </h2>
                        <p className="text-sm font-medium leading-6 text-gray-700">
                            คุณได้รับคำเชิญให้เข้าร่วมระบบ กรุณาตั้งรหัสผ่าน
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <div className={AUTH_CARD_CLASS}>
                    <AcceptInviteForm
                        token={token}
                        inviteData={result.invite}
                    />
                </div>
            </div>
        </div>
    );
}
