import Link from "next/link";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kru Nangfah - ระบบดูแลช่วยเหลือนักเรียน",
    description:
        "ระบบจัดการข้อมูลและติดตามผลโครงการเพื่อการดูแลนักเรียนอย่างใกล้ชิดและอบอุ่น",
};

export default async function Home() {
    const session = await getServerSession();

    if (session?.user) {
        redirect("/dashboard");
    }

    // Not logged in - show landing page
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-between overflow-hidden bg-linear-to-br from-rose-50 via-white to-pink-100">
            {/* Ambient Background - Matching signin/signup style */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-10 left-5 sm:left-10 w-60 sm:w-72 h-60 sm:h-72 bg-rose-200 rounded-full mix-blend-multiply blur-3xl opacity-60 animate-pulse delay-75" />
                <div className="absolute bottom-10 right-5 sm:right-10 w-60 sm:w-72 h-60 sm:h-72 bg-orange-100 rounded-full mix-blend-multiply blur-3xl opacity-60 animate-pulse delay-150" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-pink-100 rounded-full mix-blend-multiply blur-3xl opacity-40 animate-pulse" />
                <div className="absolute top-[20%] right-[10%] w-48 sm:w-64 h-48 sm:h-64 bg-purple-100 rounded-full mix-blend-multiply blur-3xl opacity-30 animate-pulse delay-300" />
            </div>

            {/* Spacer top */}
            <div className="flex-1" />

            {/* Main Content Container */}
            <main className="relative z-10 w-full max-w-5xl px-6 py-12 flex flex-col items-center text-center">
                {/* Hero Icon */}
                <div className="mb-8 relative group cursor-default">
                    <div className="absolute -inset-4 bg-linear-to-r from-rose-200 to-pink-200 rounded-full blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500 animate-pulse" />
                    <div className="relative bg-white/80 backdrop-blur-xl p-5 rounded-3xl shadow-lg ring-1 ring-white/60 transform transition-transform duration-500 hover:scale-105 hover:rotate-3">
                        <span className="text-6xl drop-shadow-sm select-none animate-fairy-fly">
                            🧚‍♀️
                        </span>
                    </div>
                </div>

                {/* Hero Text */}
                <h1 className="hero-title-depth text-4xl sm:text-5xl md:text-7xl font-extrabold bg-linear-to-r from-rose-400 via-pink-500 to-pink-600 bg-clip-text text-transparent py-2 px-4 leading-normal animate-fade-in-up">
                    โครงการครูนางฟ้า
                </h1>

                {/* Decorative sparkle divider */}
                <div className="flex items-center gap-3 mb-6 animate-fade-in-up animation-delay-200">
                    <span className="sparkle-dot" />
                    <div className="h-px w-16 bg-linear-to-r from-transparent via-pink-300 to-transparent" />
                    <span className="sparkle-dot" />
                    <div className="h-px w-16 bg-linear-to-r from-transparent via-rose-300 to-transparent" />
                    <span className="sparkle-dot" />
                </div>

                <p className="subtitle-dimensional text-lg md:text-2xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-semibold animate-fade-in-up animation-delay-200">
                    ระบบดูแลช่วยเหลือนักเรียนยุคใหม่
                    <br className="hidden sm:block" />
                    <span className="text-embossed text-slate-400 font-medium">
                        {" "}
                        เพื่อการดูแลสุขภาพจิตนักเรียน (Angel Teacher Creative
                        Assets)
                    </span>
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-600">
                    <Link
                        href="/signin"
                        className="btn-text-depth w-full sm:w-auto px-10 py-4 bg-linear-to-r from-pink-50 to-white text-pink-600 text-lg font-bold rounded-full border border-pink-200 hover:from-pink-100 hover:to-white transition-all duration-300 shadow-lg shadow-pink-100/50 hover:shadow-xl hover:shadow-pink-200 hover:-translate-y-1"
                    >
                        เข้าสู่ระบบ
                    </Link>

                    <Link
                        href="/signup"
                        className="btn-text-depth w-full sm:w-auto px-10 py-4 bg-white/50 backdrop-blur-sm text-pink-600 text-lg font-bold rounded-full border-2 border-pink-100 hover:bg-white hover:border-pink-200 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1"
                    >
                        ลงทะเบียน
                    </Link>
                </div>
            </main>

            {/* Spacer bottom */}
            <div className="flex-1" />

            {/* Footer / Credits */}
            <footer className="footer-embossed relative z-10 pb-6 text-slate-400 text-sm font-medium animate-fade-in-up animation-delay-600">
                © {new Date().getFullYear()} Kru Nangfah Project
            </footer>
        </div>
    );
}
