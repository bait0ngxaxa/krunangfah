import { SignInForm } from "@/components/auth/SignInForm";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { NavbarGreenBar } from "@/components/layout/NavbarGreenBar";

export const metadata: Metadata = {
    title: "เข้าสู่ระบบ | โครงการครูนางฟ้า",
    description: "เข้าสู่ระบบเพื่อใช้งานโครงการครูนางฟ้า",
};

export default async function SignInPage({
    searchParams,
}: {
    searchParams: Promise<{ callbackUrl?: string }>;
}) {
    const { callbackUrl } = await searchParams;

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

                {/* Sign-in card */}
                <div className="w-full max-w-sm bg-white/90 backdrop-blur-sm rounded-3xl border-2 border-emerald-200 shadow-lg px-6 sm:px-8 py-7 sm:py-8">
                    <SignInForm callbackUrl={callbackUrl} />
                </div>
            </div>
        </div>
    );
}
