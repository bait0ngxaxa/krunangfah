import Link from "next/link";
import { getServerSession } from "@/lib/auth";
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
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-rose-50 via-white to-pink-100 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse delay-75" />
            <div className="absolute bottom-20 right-10 w-72 h-72 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse delay-150" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />

            <div className="max-w-4xl w-full px-6 py-12 text-center relative z-10">
                <div className="mb-6 inline-block p-4 rounded-full bg-white/50 backdrop-blur-xs shadow-sm animate-fade-in-up">
                    <span className="text-4xl">🧚‍♀️</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold bg-linear-to-r from-rose-400 to-pink-600 bg-clip-text text-transparent mb-6 drop-shadow-sm py-2 leading-tight animate-fade-in-up animation-delay-200">
                    โครงการครูนางฟ้า
                </h1>

                <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto font-medium leading-relaxed animate-fade-in-up animation-delay-400">
                    ระบบจัดการและติดตามผลการคัดกรอง{" "}
                    <br className="hidden md:block" />
                    เพื่อการดูแลนักเรียนอย่างใกล้ชิดและอบอุ่น
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-600">
                    <Link
                        href="/signin"
                        className="w-full sm:w-auto px-10 py-4 bg-linear-to-r from-pink-50 to-white text-pink-600 text-lg font-bold rounded-full border border-pink-200 hover:from-pink-100 hover:to-white transition-all duration-300 shadow-lg shadow-pink-100/50 hover:shadow-xl hover:shadow-pink-200 hover:-translate-y-1"
                    >
                        เข้าสู่ระบบ
                    </Link>

                    <Link
                        href="/signup"
                        className="w-full sm:w-auto px-10 py-4 bg-white/50 backdrop-blur-sm text-pink-600 text-lg font-bold rounded-full border-2 border-pink-100 hover:bg-white hover:border-pink-200 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1"
                    >
                        ลงทะเบียน
                    </Link>
                </div>
            </div>
        </div>
    );
}
