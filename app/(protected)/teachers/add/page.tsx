import { requireAuth } from "@/lib/session";
import { AddTeacherForm } from "@/components/teacher";

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "เพิ่มครูผู้ดูแล | โครงการครูนางฟ้า",
    description: "เพิ่มครูผู้ดูแลนักเรียน",
};

export default async function AddTeacherPage() {
    await requireAuth();

    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-8 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 -translate-x-1/3 translate-y-1/3 pointer-events-none" />

            <div className="max-w-2xl mx-auto relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <Link
                        href="/dashboard"
                        className="text-gray-500 hover:text-pink-600 flex items-center gap-2 font-medium transition-colors px-3 py-1.5 rounded-full hover:bg-pink-50"
                    >
                        ← กลับหน้าหลัก
                    </Link>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-100/50 p-8 border border-white/60 relative overflow-hidden ring-1 ring-pink-50">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-300 via-pink-300 to-orange-300" />

                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-2xl shadow-sm border border-pink-200">
                            👤
                        </div>
                        <h1 className="text-2xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                            เพิ่มครูผู้ดูแลนักเรียน
                        </h1>
                    </div>

                    <p className="text-gray-600 mb-8 bg-pink-50/50 p-4 rounded-xl border border-pink-100/50 flex items-start gap-2">
                        <span className="text-pink-500 mt-0.5">ℹ️</span>
                        <span>
                            กรอกข้อมูลครูผู้ดูแล ระบบจะสร้าง Link
                            สำหรับให้ครูผู้ดูแลใช้ในการตั้งรหัสผ่าน
                        </span>
                    </p>
                    <AddTeacherForm />
                </div>
            </div>
        </div>
    );
}
