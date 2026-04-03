import { FileUp } from "lucide-react";
import { PageBanner } from "@/components/ui/PageBanner";
import { ImportClient } from "@/components/student/import/ImportClient";
import { requireAuth } from "@/lib/session";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "นำเข้าข้อมูลนักเรียน | โครงการครูนางฟ้า",
    description: "อัพโหลดไฟล์ Excel ที่มีข้อมูลนักเรียนและผลคะแนน PHQ-A",
};

export default async function StudentImportPage() {
    // Server-side auth check — prevents unauthenticated access without
    // shipping the auth logic to the client bundle
    await requireAuth();

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
                imageAlt="Import Students"
                imageContainerClassName="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100px] sm:w-[150px] lg:w-[190px] pointer-events-none z-10 flex items-end"
                backUrl="/students"
                backLabel="กลับหน้านักเรียน"
            />

            <div className="max-w-6xl mx-auto relative z-10 px-4 py-8">
                <ImportClient />
            </div>
        </div>
    );
}
