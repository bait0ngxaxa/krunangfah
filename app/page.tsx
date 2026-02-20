import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "โครงการครูนางฟ้า - ระบบดูแลช่วยเหลือนักเรียน",
    description:
        "ระบบจัดการข้อมูลและติดตามผลโครงการเพื่อการดูแลนักเรียนอย่างใกล้ชิดและอบอุ่น",
};

export default async function Home() {
    const session = await getServerSession();

    if (session?.user) {
        redirect("/dashboard");
    }

    return (
        <div className="relative h-screen flex flex-col overflow-hidden bg-[#c8f5e6]">
            {/* ─── Top Green Navbar ─── */}
            <nav
                className="relative z-20"
                style={{ marginTop: "-48px", paddingTop: "48px" }}
            >
                <div
                    className="w-full flex items-center"
                    style={{
                        background: "#00DB87",
                        height: "120px",
                        borderRadius: "0px 0px 36px 45px",
                    }}
                >
                    <div className="flex items-end h-full pl-0 w-full">
                        {/* Logo — fills full navbar height, snug to bottom-left corner */}
                        <Link href="/" className="flex items-end group h-full">
                            <Image
                                src="/image/homepage/icon 1.png"
                                alt="Kru Nangfah"
                                width={240}
                                height={120}
                                className="h-full w-auto object-contain"
                                priority
                            />
                        </Link>
                    </div>
                    {/* หน้าหลัก — Figma: top:34px, left:1187px on 1440 canvas */}
                    <span
                        className="absolute text-white"
                        style={{
                            top: "80px",
                            right: "131px" /* 1440-1187-122 = 131px from right */,
                            width: "122px",
                            height: "55px",
                            fontSize: "30px",
                            lineHeight: "55px",
                            fontWeight: "400",
                        }}
                    >
                        หน้าหลัก
                    </span>
                </div>
            </nav>

            {/* ─── Absolute: เข้าสู่ระบบ button — Figma top:152px, right:77px (1440-1131-232) ─── */}
            <div
                className="absolute z-30"
                style={{ top: "152px", right: "77px" }}
            >
                <Link
                    href="/signin"
                    className="inline-flex items-center justify-center bg-white text-gray-700 font-bold rounded-full border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-300 hover:-translate-y-1"
                    style={{
                        width: "232px",
                        height: "73px",
                        fontSize: "1.125rem",
                        filter: "drop-shadow(0px 4px 10px rgba(0, 0, 0, 0.5))",
                    }}
                >
                    เข้าสู่ระบบ
                </Link>
            </div>

            {/* ─── Main Hero Section ─── */}
            <main className="relative z-10 flex-1 flex flex-col px-6 sm:px-10 lg:px-16 pt-4 sm:pt-6 lg:pt-8 pb-0 w-full">
                {/* Heading only — button and หน้าหลัก are absolute below navbar */}
                <div className="flex flex-col items-start">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-gray-800 leading-tight mb-1">
                        ระบบดูแล
                    </h1>
                    <div className="mb-4">
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-700 leading-snug">
                            ช่วยเหลือนักเรียน
                        </p>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800 leading-tight">
                            ยุคใหม่
                        </p>
                    </div>
                </div>

                {/* Center — Hero Illustration (absolute center of viewport) */}
                <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                    <div className="relative w-[280px] sm:w-[360px] md:w-[440px] lg:w-[500px] xl:w-[560px]">
                        <Image
                            src="/image/homepage/hero.png"
                            alt="ครูนางฟ้าพานักเรียนบิน"
                            width={860}
                            height={750}
                            className="w-full h-auto object-contain drop-shadow-2xl"
                            priority
                        />
                    </div>
                </div>
            </main>

            {/* ─── Bottom Cloud / Fog Effect ─── */}
            <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-40 bg-linear-to-t from-white/80 via-white/40 to-transparent z-10 pointer-events-none" />

            {/* Subtitle - absolute bottom left, aligned with main px */}
            <div className="absolute bottom-6 left-6 sm:left-10 lg:left-16 z-20">
                <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
                    เพื่อการดูแลสุขภาพจิตนักเรียน
                </p>
                <p className="text-xs sm:text-sm text-gray-400 font-normal">
                    Angel Teacher Creative Assets
                </p>
            </div>

            {/* Subtle ambient blobs */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[30%] left-[5%] w-48 sm:w-64 h-48 sm:h-64 bg-emerald-200 rounded-full mix-blend-multiply blur-3xl opacity-25 animate-pulse" />
                <div className="absolute top-[50%] right-[15%] w-40 sm:w-56 h-40 sm:h-56 bg-teal-100 rounded-full mix-blend-multiply blur-3xl opacity-20 animate-pulse delay-150" />
                <div className="absolute bottom-[20%] left-[30%] w-56 sm:w-72 h-56 sm:h-72 bg-cyan-100 rounded-full mix-blend-multiply blur-3xl opacity-15 animate-pulse delay-300" />
            </div>
        </div>
    );
}
