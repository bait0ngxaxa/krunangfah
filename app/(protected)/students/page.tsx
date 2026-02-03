import { ArrowLeft, Upload } from "lucide-react";
import { getStudents } from "@/lib/actions/student";
import { StudentDashboard } from "@/components/student";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MyStudentsPage() {
    const { students } = await getStudents();

    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Back Button */}
                <div className="mb-6">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-pink-50 px-4 py-2 rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>กลับหน้า Dashboard</span>
                    </Link>
                </div>

                {/* Header */}
                <div className="flex justify-between items-center mb-8 bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-white/50">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                            นักเรียนทั้งหมด
                        </h1>
                        <p className="text-gray-600 mt-1 text-sm font-medium">
                            ข้อมูลนักเรียนและผลคัดกรอง PHQ-A
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/students/import"
                            className="px-5 py-2.5 bg-linear-to-r from-pink-400 to-purple-400 text-white rounded-full hover:from-pink-500 hover:to-purple-500 transition-all shadow-md hover:shadow-lg text-sm font-bold flex items-center gap-2"
                        >
                            <span>📥</span> นำเข้าข้อมูล
                        </Link>
                    </div>
                </div>

                {/* Main Content */}
                {students.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-12 border border-pink-100 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-pink-300 to-purple-300" />
                        <div className="py-8">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-pink-50 flex items-center justify-center border-4 border-white shadow-inner">
                                <span className="text-4xl">📝</span>
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
                                className="inline-flex items-center gap-2 px-8 py-3.5 bg-linear-to-r from-pink-400 to-purple-400 text-white rounded-full hover:from-pink-500 hover:to-purple-500 transition-all font-bold shadow-lg hover:shadow-xl hover:-translate-y-1"
                            >
                                <Upload className="w-5 h-5" />
                                นำเข้าข้อมูลนักเรียน
                            </Link>
                        </div>
                    </div>
                ) : (
                    <StudentDashboard students={students} />
                )}
            </div>
        </div>
    );
}
