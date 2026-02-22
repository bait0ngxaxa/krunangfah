import { Suspense } from "react";
import { FileUp, ClipboardList, Users } from "lucide-react";
import { getStudents } from "@/lib/actions/student";
import { getSchools } from "@/lib/actions/dashboard.actions";
import { getReferredOutStudents } from "@/lib/actions/referral.actions";
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
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
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
    const isClassTeacher = userRole === "class_teacher";
    const [{ students }, schools, referredOutStudents] = await Promise.all([
        getStudents({ limit: 10000 }),
        isAdmin ? getSchools() : Promise.resolve([]),
        isClassTeacher ? getReferredOutStudents() : Promise.resolve([]),
    ]);

    if (students.length === 0 && !isAdmin) {
        return (
            <div className="relative bg-white rounded-2xl shadow-sm p-6 md:p-12 border-2 border-gray-100 text-center overflow-hidden">
                <div className="relative py-8">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="relative w-full h-full rounded-full bg-emerald-50 shadow-sm flex items-center justify-center ring-1 ring-emerald-100/50">
                            <ClipboardList className="w-10 h-10 text-emerald-500" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">
                        ยังไม่มีข้อมูลนักเรียน
                    </h2>
                    <p className="text-slate-500 mb-8 max-w-md mx-auto">
                        เริ่มต้นด้วยการนำเข้าข้อมูลนักเรียนจากไฟล์ Excel
                        เพื่อเริ่มติดตามและดูแลนักเรียนของคุณ
                    </p>
                    <Link
                        href="/students/import"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-all font-bold shadow-sm hover:shadow-md hover:-translate-y-1 duration-300"
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
            referredOutStudents={isClassTeacher ? referredOutStudents : undefined}
        />
    );
}
