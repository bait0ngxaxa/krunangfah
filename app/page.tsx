import Link from "next/link";
import Image from "next/image";
import { NavbarGreenBar } from "@/components/layout/NavbarGreenBar";
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
        <div className="relative h-screen flex flex-col overflow-hidden bg-linear-to-b from-sky-300 via-sky-100 to-white">
            {/* Background image — rainbow */}
            <Image
                src="/image/homepage/rainbow.png"
                alt=""
                fill
                className="object-cover object-bottom overflow-hidden transform scale-125 md:scale-110"
                priority
            />

            {/* ─── Top Green Navbar ─── */}
            <NavbarGreenBar>
                {/* หน้าหลัก */}
                <div className="ml-auto pr-6 sm:pr-12 lg:pr-[131px] flex items-center">
                    <span className="text-white font-medium text-xl sm:text-2xl lg:text-[30px]">
                        หน้าหลัก
                    </span>
                </div>
            </NavbarGreenBar>

            {/* ─── Main Hero Section ─── */}
            <main className="relative z-10 flex-1 flex flex-col px-6 sm:px-10 lg:px-16 pt-8 sm:pt-10 lg:pt-8 pb-0 w-full">
                {/* Mobile/Tablet: Login button at top right */}
                <div className="flex justify-end lg:hidden w-full mb-6 animate-fade-in-down">
                    <Link
                        href="/signin"
                        className="inline-flex items-center justify-center bg-white text-emerald-700 font-bold rounded-full border-2 border-emerald-400 hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-300 active:scale-95 w-32 h-10 sm:w-40 sm:h-12 text-sm sm:text-base shadow-md"
                    >
                        เข้าสู่ระบบ
                    </Link>
                </div>

                {/* ─── Absolute: เข้าสู่ระบบ button (Desktop) ─── */}
                <div className="hidden lg:block absolute z-30 lg:top-[120px] xl:top-[152px] lg:right-[60px] xl:right-[77px] animate-fade-in-down">
                    <Link
                        href="/signin"
                        className="inline-flex items-center justify-center bg-white text-emerald-700 font-bold rounded-full border-2 border-emerald-400 hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-300 hover:-translate-y-1 lg:w-[180px] lg:h-[60px] xl:w-[232px] xl:h-[73px] lg:text-base xl:text-[1.125rem]"
                        style={{
                            filter: "drop-shadow(0px 4px 10px rgba(0, 0, 0, 0.5))",
                        }}
                    >
                        เข้าสู่ระบบ
                    </Link>
                </div>

                {/* Heading */}
                <div className="flex flex-col items-start mt-2 sm:mt-0 animate-fade-in-left">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-gray-800 leading-tight mb-1 hero-title-depth">
                        ระบบดูแล
                    </h1>
                    <div className="mb-4">
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-700 leading-snug subtitle-dimensional">
                            ช่วยเหลือนักเรียน
                        </p>
                    </div>
                </div>

                {/* Center — Hero Illustration (absolute center of viewport) */}
                <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none mt-24 sm:mt-0 animate-fade-in-right animation-delay-200">
                    <div className="relative w-[280px] sm:w-[360px] md:w-[440px] lg:w-[500px] xl:w-[560px] animate-float">
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
