import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SchoolSetupWizard } from "@/components/school/setup/SchoolSetupWizard";
import { School } from "lucide-react";
import { PageHeaderCard } from "@/components/ui/PageHeaderCard";
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
            <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--brand-primary)] rounded-full mix-blend-multiply blur-3xl opacity-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#34D399] rounded-full mix-blend-multiply blur-3xl opacity-10 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <PageHeaderCard
                    icon={School}
                    title="ตั้งค่าโรงเรียน"
                    description="มาตั้งค่าโรงเรียนและห้องเรียนก่อนเริ่มใช้งานระบบ"
                    className="mb-8"
                />

                <div className="max-w-2xl mx-auto">
                    <SchoolSetupWizard initialHasSchool={hasSchool} />
                </div>
            </div>
        </div>
    );
}
