/**
 * My Students Page
 * หน้าแสดงนักเรียนทั้งหมดของครู
 */

import { getStudents } from "@/lib/actions/student.actions";
import { StudentDashboard } from "@/components/student/StudentDashboard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import Link from "next/link";

export default async function MyStudentsPage() {
    const students = await getStudents();

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                            นักเรียนของฉัน
                        </h1>
                        <p className="text-gray-600 mt-1">
                            ข้อมูลนักเรียนและผลคัดกรอง PHQ-A
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/students/import"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            + นำเข้าข้อมูล
                        </Link>
                        <LogoutButton />
                    </div>
                </div>

                {/* Main Content */}
                {students.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                        <div className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                                <svg
                                    className="w-10 h-10 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">
                                ยังไม่มีข้อมูลนักเรียน
                            </h2>
                            <p className="text-gray-500 mb-6">
                                เริ่มต้นด้วยการนำเข้าข้อมูลนักเรียนจากไฟล์ Excel
                            </p>
                            <Link
                                href="/students/import"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                    />
                                </svg>
                                นำเข้าข้อมูลนักเรียน
                            </Link>
                        </div>
                    </div>
                ) : (
                    <StudentDashboard students={students} />
                )}

                {/* Back Button */}
                <div className="mt-6">
                    <Link
                        href="/dashboard"
                        className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                        กลับไปหน้า Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
