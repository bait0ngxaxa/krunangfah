import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SchoolSetupWizard } from "@/components/school/setup";
import Image from "next/image";
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

    // ต้องสร้าง teacher profile ก่อน school setup
    if (!dbUser?.teacher) {
        redirect("/teacher-profile");
    }

    // ส่ง flag ไปให้ client แทนการ redirect ตรงนี้
    // เพราะ server action revalidation จะ re-run page component
    // ถ้า redirect ที่นี่ จะข้ามขั้นตอน wizard ทันที
    const hasSchool = !!dbUser?.schoolId;

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-100 relative overflow-hidden px-4 py-10 sm:py-16">
            {/* Decorative Background */}
            <div className="absolute top-10 left-5 sm:left-10 w-60 sm:w-72 h-60 sm:h-72 bg-[#34D399] rounded-full mix-blend-multiply blur-3xl opacity-10 animate-pulse" />
            <div className="absolute bottom-10 right-5 sm:right-10 w-60 sm:w-72 h-60 sm:h-72 bg-[#0BD0D9] rounded-full mix-blend-multiply blur-3xl opacity-10 animate-pulse delay-150" />

            <div className="relative z-10 max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10 relative">
                    <div className="relative inline-flex items-center justify-center mb-6">
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
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                        ยินดีต้อนรับสู่ครูนางฟ้า
                    </h1>
                    <p className="mt-2 text-slate-500 font-medium text-sm sm:text-base max-w-sm mx-auto">
                        มาตั้งค่าโรงเรียนของคุณก่อนเริ่มใช้งานระบบ
                    </p>
                </div>

                <SchoolSetupWizard initialHasSchool={hasSchool} />
            </div>
        </div>
    );
}
