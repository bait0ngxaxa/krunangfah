import { Suspense } from "react";
import {
    FileUp,
    ClipboardList,
    Users,
} from "lucide-react";
import { getStudents } from "@/lib/actions/student";
import { getSchools } from "@/lib/actions/dashboard.actions";
import { requireAuth } from "@/lib/session";
import {
    StudentDashboard,
    StudentDashboardSkeleton,
} from "@/components/student";
import { PageBanner } from "@/components/ui/PageBanner";
import Link from "next/link";

export default async function MyStudentsPage() {
    const session = await requireAuth();
    const userRole = session.user.role;
    const isAdmin = userRole === "system_admin";

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-green-50 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <PageBanner
                title="นักเรียนทั้งหมด"
                subtitle={
                    <>
                        ข้อมูลนักเรียนและ
                        <br />
                        ผลคัดกรอง PHQ-A
                    </>
                }
                icon={Users}
                imageSrc="/image/dashboard/students.png"
                actionNode={
                    !isAdmin ? (
                        <Link
                            href="/students/import"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-600 rounded-2xl font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-sm border-2 border-emerald-400 relative z-30"
                        >
                            <FileUp className="w-4 h-4 stroke-3" /> นำเข้าข้อมูล
                        </Link>
                    ) : null
                }
            />

            {/* Main Content Area */}
            <div className="max-w-4xl mx-auto relative z-10 px-4 py-8">
                {/* Main Content (streamed via Suspense) */}
                <Suspense fallback={<StudentDashboardSkeleton />}>
                    <StudentsContent userRole={userRole} isAdmin={isAdmin} />
                </Suspense>
            </div>
        </div>
    );
}

/* ─── Async Content (streamed via Suspense) ─── */

async function StudentsContent({
    userRole,
    isAdmin,
}: {
    userRole: string;
    isAdmin: boolean;
}) {
    const [{ students }, schools] = await Promise.all([
        getStudents({ limit: 10000 }),
        isAdmin ? getSchools() : Promise.resolve([]),
    ]);

    if (students.length === 0 && !isAdmin) {
        return (
            <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 p-6 md:p-12 border border-emerald-200 ring-1 ring-emerald-50 text-center overflow-hidden">
                {/* Gradient accent top */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-emerald-400 via-green-400 to-emerald-300 opacity-60" />
                {/* Corner decoration */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-linear-to-br from-emerald-200/25 to-green-300/20 rounded-full blur-xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-linear-to-br from-green-200/20 to-emerald-300/15 rounded-full blur-xl pointer-events-none" />

                <div className="relative py-8">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full bg-emerald-300 blur-xl opacity-30" />
                        <div className="relative w-full h-full rounded-full bg-linear-to-br from-emerald-50 to-green-50 flex items-center justify-center border-4 border-white shadow-inner ring-1 ring-emerald-100/50">
                            <ClipboardList className="w-10 h-10 text-emerald-500" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                        ยังไม่มีข้อมูลนักเรียน
                    </h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        เริ่มต้นด้วยการนำเข้าข้อมูลนักเรียนจากไฟล์ Excel
                        เพื่อเริ่มติดตามและดูแลนักเรียนของคุณ
                    </p>
                    <Link
                        href="/students/import"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#0BD0D9] text-white rounded-full hover:brightness-95 transition-all font-bold shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:shadow-emerald-300/50 hover:-translate-y-1 duration-300"
                    >
                        <FileUp className="w-5 h-5 stroke-[2.5]" />{" "}
                        นำเข้าข้อมูลนักเรียน
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <StudentDashboard
            students={students}
            schools={isAdmin ? schools : undefined}
            userRole={userRole}
        />
    );
}
