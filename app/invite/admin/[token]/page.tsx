import { XCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { validateInviteToken } from "@/lib/actions/school-admin-invite.actions";
import { InviteRegisterForm } from "@/components/auth/InviteRegisterForm";
import { NavbarGreenBar } from "@/components/layout/NavbarGreenBar";
import type { InviteRole } from "@/types/school-admin-invite.types";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ลงทะเบียน Admin | โครงการครูนางฟ้า",
    description: "สร้างบัญชีเพื่อเข้าใช้งานระบบ",
};

function getRoleLabel(role: InviteRole): string {
    switch (role) {
        case "system_admin":
            return "System Admin";
        case "school_admin":
            return "School Admin";
    }
}

interface AdminInvitePageProps {
    params: Promise<{ token: string }>;
}

export default async function AdminInvitePage({
    params,
}: AdminInvitePageProps) {
    const { token } = await params;

    let email: string;
    let role: InviteRole = "school_admin";
    let errorMessage: string | null = null;

    try {
        const result = await validateInviteToken(token);
        email = result.email;
        role = result.role;
    } catch (error) {
        errorMessage =
            error instanceof Error
                ? error.message
                : "ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว";
        email = "";
    }

    if (errorMessage) {
        return (
            <div className="relative min-h-dvh flex flex-col overflow-hidden">
                <Image
                    src="/image/login_bg.png"
                    alt=""
                    fill
                    className="object-cover object-bottom"
                    priority
                />

                <NavbarGreenBar>
                    <div className="ml-auto pr-6 sm:pr-12 lg:pr-[131px] flex items-center">
                        <Link
                            href="/"
                            className="text-white hover:opacity-80 transition-opacity font-medium text-xl sm:text-2xl lg:text-[30px]"
                        >
                            หน้าหลัก
                        </Link>
                    </div>
                </NavbarGreenBar>

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-8 sm:pt-12 pb-8">
                    <div className="w-full max-w-sm bg-white/90 backdrop-blur-md rounded-3xl border-2 border-red-200 shadow-xl p-8 text-center">
                        <div className="mb-4 flex justify-center">
                            <XCircle className="w-16 h-16 text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-3">
                            ลิงก์ไม่ถูกต้อง
                        </h1>
                        <p className="text-gray-600 mb-6">{errorMessage}</p>
                        <Link
                            href="/"
                            className="inline-block px-6 py-3 bg-[#00DB87] hover:bg-[#00c078] text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all"
                        >
                            กลับหน้าหลัก
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

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
                <div className="ml-auto pr-6 sm:pr-12 lg:pr-[131px] flex items-center">
                    <Link
                        href="/"
                        className="text-white hover:opacity-80 transition-opacity font-medium text-xl sm:text-2xl lg:text-[30px]"
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
                    <div className="bg-white/70 backdrop-blur-sm px-6 py-4 rounded-2xl inline-block shadow-sm border border-emerald-100">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">
                            สร้างบัญชี {getRoleLabel(role)}
                        </h2>
                        <p className="text-sm text-gray-700 font-medium">
                            คุณได้รับคำเชิญให้เข้าร่วมระบบ กรุณาตั้งรหัสผ่าน
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="w-full max-w-sm bg-white/90 backdrop-blur-sm rounded-3xl border-2 border-emerald-200 shadow-lg px-6 sm:px-8 py-7 sm:py-8">
                    <InviteRegisterForm
                        token={token}
                        email={email}
                        redirectTo={
                            role === "system_admin"
                                ? "/dashboard"
                                : "/teacher-profile"
                        }
                    />
                </div>

                <p className="mt-8 text-center text-xs text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] font-medium">
                    © {new Date().getFullYear()} Kru Nangfah Project
                </p>
            </div>
        </div>
    );
}
