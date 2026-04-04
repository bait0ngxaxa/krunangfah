import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SchoolSetupWizard } from "@/components/school/setup/SchoolSetupWizard";
import { School } from "lucide-react";
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

    // system_admin bypasses onboarding setup screens.
    if (session.user.role === "system_admin") {
        redirect("/dashboard");
    }

    // Read from DB to avoid stale JWT values after profile/setup mutations.
    const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            schoolId: true,
            teacher: { select: { id: true } },
        },
    });

    // School setup is available only after teacher profile exists.
    if (!dbUser?.teacher) {
        redirect("/teacher-profile");
    }

    // Keep user in wizard flow; client handles post-submit navigation.
    const hasSchool = !!dbUser?.schoolId;

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 py-6 px-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-[#0BD0D9] rounded-full mix-blend-multiply blur-3xl opacity-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#34D399] rounded-full mix-blend-multiply blur-3xl opacity-10 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="relative bg-white rounded-4xl border-2 border-[#0BD0D9] shadow-sm p-5 sm:p-6 mb-8 overflow-hidden group">
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#0BD0D9]/10 rounded-full blur-xl pointer-events-none" />

                    <div className="relative flex items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#0BD0D9] flex items-center justify-center shadow-md group-hover:-translate-y-1 transition-transform duration-300">
                                <School className="w-6 h-6 text-[#0BD0D9] stroke-[2.5]" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                                ตั้งค่าโรงเรียน
                            </h1>
                            <p className="text-sm text-gray-500">
                                มาตั้งค่าโรงเรียนและห้องเรียนก่อนเริ่มใช้งานระบบ
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto">
                    <SchoolSetupWizard initialHasSchool={hasSchool} />
                </div>
            </div>
        </div>
    );
}
