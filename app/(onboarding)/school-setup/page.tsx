import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SchoolSetupWizard } from "@/components/school/SchoolSetupWizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ตั้งค่าโรงเรียน | โครงการครูนางฟ้า",
    description: "ตั้งค่าข้อมูลโรงเรียนและห้องเรียน",
};

export default async function SchoolSetupPage() {
    const session = await getServerSession();

    if (!session?.user) {
        redirect("/signin");
    }

    // system_admin ไม่ต้องตั้งค่าโรงเรียน
    if (session.user.role === "system_admin") {
        redirect("/dashboard");
    }

    // Check DB directly (JWT may be stale)
    const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            schoolId: true,
            teacher: { select: { id: true } },
        },
    });

    // มีโรงเรียนแล้ว ไม่ต้องทำซ้ำ
    if (dbUser?.schoolId) {
        redirect("/dashboard");
    }

    // ต้องสร้าง teacher profile ก่อน school setup
    if (!dbUser?.teacher) {
        redirect("/teacher-profile");
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-100 relative overflow-hidden px-4 py-10 sm:py-16">
            {/* Decorative Background */}
            <div className="absolute top-10 left-5 sm:left-10 w-60 sm:w-72 h-60 sm:h-72 bg-emerald-200 rounded-full mix-blend-multiply blur-3xl opacity-50 animate-pulse" />
            <div className="absolute bottom-10 right-5 sm:right-10 w-60 sm:w-72 h-60 sm:h-72 bg-cyan-100 rounded-full mix-blend-multiply blur-3xl opacity-50 animate-pulse delay-150" />

            <div className="relative z-10 max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-linear-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-200/50 mb-4">
                        <span className="text-3xl">🧚‍♀️</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold bg-linear-to-r from-emerald-400 via-teal-500 to-teal-600 bg-clip-text text-transparent">
                        ยินดีต้อนรับสู่ครูนางฟ้า
                    </h1>
                    <p className="mt-2 text-gray-500 text-sm sm:text-base">
                        มาตั้งค่าโรงเรียนของคุณก่อนเริ่มใช้งานระบบ
                    </p>
                </div>

                <SchoolSetupWizard />
            </div>
        </div>
    );
}
