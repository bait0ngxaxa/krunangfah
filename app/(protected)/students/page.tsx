import { ArrowLeft, GraduationCap, FileUp, ClipboardList } from "lucide-react";
import { getStudents } from "@/lib/actions/student";
import { getSchools } from "@/lib/actions/dashboard.actions";
import { requireAuth } from "@/lib/session";
import { StudentDashboard } from "@/components/student";
import Link from "next/link";

export default async function MyStudentsPage() {
    // Start independent promises immediately (avoid waterfall)
    const sessionPromise = requireAuth();
    const studentsPromise = getStudents({ limit: 10000 });

    const session = await sessionPromise;
    const userRole = session.user.role;
    const isAdmin = userRole === "system_admin";

    // Parallelize students + schools fetch
    const [{ students }, schools] = await Promise.all([
        studentsPromise,
        isAdmin ? getSchools() : Promise.resolve([]),
    ]);

    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-6 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Back Button */}
                <div className="mb-5">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-pink-50/80 px-4 py-2 rounded-full group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-300" />
                        <span>กลับหน้า Dashboard</span>
                    </Link>
                </div>

                {/* Header */}
                <div className="relative flex justify-between items-center mb-6 bg-white/80 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 overflow-hidden group">
                    {/* Gradient accent bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-400 via-pink-400 to-rose-300 opacity-60" />
                    {/* Top shimmer */}
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-linear-to-br from-rose-200/20 to-pink-300/15 rounded-full blur-xl pointer-events-none" />

                    <div className="relative flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-xl bg-pink-400 blur-md opacity-30" />
                            <div className="relative p-2.5 bg-linear-to-br from-rose-100 to-pink-100 rounded-xl shadow-inner ring-1 ring-rose-200/50">
                                <GraduationCap className="w-6 h-6 text-pink-500" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                                นักเรียนทั้งหมด
                            </h1>
                            <p className="text-gray-500 mt-0.5 text-sm font-medium">
                                ข้อมูลนักเรียนและผลคัดกรอง PHQ-A
                            </p>
                        </div>
                    </div>
                    {!isAdmin ? (
                        <div className="relative flex items-center gap-4">
                            <Link
                                href="/students/import"
                                className="px-5 py-2.5 bg-linear-to-r from-rose-400 to-pink-500 text-white rounded-full hover:from-rose-500 hover:to-pink-600 transition-all shadow-md shadow-pink-200/50 hover:shadow-lg hover:shadow-pink-300/50 text-sm font-bold flex items-center gap-2 hover:-translate-y-0.5 duration-300"
                            >
                                <FileUp className="w-4 h-4" /> นำเข้าข้อมูล
                            </Link>
                        </div>
                    ) : null}
                </div>

                {/* Main Content */}
                {students.length === 0 && !isAdmin ? (
                    <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-6 md:p-12 border border-white/60 ring-1 ring-pink-50 text-center overflow-hidden">
                        {/* Gradient accent top */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-400 via-pink-400 to-rose-300 opacity-60" />
                        {/* Corner decoration */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-linear-to-br from-rose-200/25 to-pink-300/20 rounded-full blur-xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-linear-to-br from-pink-200/20 to-rose-300/15 rounded-full blur-xl pointer-events-none" />

                        <div className="relative py-8">
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                <div className="absolute inset-0 rounded-full bg-pink-300 blur-xl opacity-30" />
                                <div className="relative w-full h-full rounded-full bg-linear-to-br from-pink-50 to-rose-50 flex items-center justify-center border-4 border-white shadow-inner ring-1 ring-pink-100/50">
                                    <ClipboardList className="w-10 h-10 text-pink-400" />
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
                                className="inline-flex items-center gap-2 px-8 py-3.5 bg-linear-to-r from-rose-400 to-pink-500 text-white rounded-full hover:from-rose-500 hover:to-pink-600 transition-all font-bold shadow-lg shadow-pink-200/50 hover:shadow-xl hover:shadow-pink-300/50 hover:-translate-y-1 duration-300"
                            >
                                <FileUp className="w-5 h-5" />{" "}
                                นำเข้าข้อมูลนักเรียน
                            </Link>
                        </div>
                    </div>
                ) : (
                    <StudentDashboard
                        students={students}
                        schools={isAdmin ? schools : undefined}
                        userRole={userRole}
                    />
                )}
            </div>
        </div>
    );
}
