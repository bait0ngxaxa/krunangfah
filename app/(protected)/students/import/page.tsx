import { FileUp } from "lucide-react";
import { PageBanner } from "@/components/ui/PageBanner";
import { ImportClient } from "@/components/student/import/ImportClient";
import { requireAuth } from "@/lib/auth/session";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "นำเข้าข้อมูลนักเรียน | โครงการครูนางฟ้า",
    description: "อัพโหลดไฟล์ Excel ที่มีข้อมูลนักเรียนและผลคะแนน PHQ-A",
};

export default async function StudentImportPage() {
    // Server-side auth check — prevents unauthenticated access without
    // shipping the auth logic to the client bundle
    const session = await requireAuth();
    const isSystemAdmin = session.user.role === "system_admin";

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            <PageBanner
                title="นำเข้าข้อมูลนักเรียน"
                subtitle={
                    <>
                        อัพโหลดไฟล์ Excel ที่มีข้อมูล
                        <br />
                        นักเรียนและผลคะแนน PHQ-A
                    </>
                }
                icon={FileUp}
                imageSrc="/image/dashboard/import.webp"
                imageAlt="นำเข้าข้อมูลนักเรียน"
                imageContainerClassName="relative z-10 mx-auto mt-2 flex w-[120px] items-end pointer-events-none sm:w-[130px] md:absolute md:bottom-0 md:left-1/2 md:mt-0 md:w-[150px] md:-translate-x-1/2 lg:w-[190px]"
                backUrl="/students"
                backLabel="กลับหน้านักเรียน"
            />

            <div className="max-w-6xl mx-auto relative z-10 px-4 py-8">
                <ImportClient canViewNationalId={isSystemAdmin} />
            </div>
        </div>
    );
}
