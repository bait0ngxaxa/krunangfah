import { requireAuth } from "@/lib/auth";
import { AddTeacherForm } from "@/components/teacher/AddTeacherForm";
import { LogoutButton } from "@/components/auth/LogoutButton";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "เพิ่มครูผู้ดูแล | โครงการครูนางฟ้า",
    description: "เพิ่มครูผู้ดูแลนักเรียน",
};

export default async function AddTeacherPage() {
    await requireAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <Link
                        href="/dashboard"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                    >
                        ← กลับหน้าหลัก
                    </Link>
                    <LogoutButton />
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-2xl font-bold text-gray-800 mb-6">
                        เพิ่มครูผู้ดูแลนักเรียน
                    </h1>
                    <p className="text-gray-600 mb-6">
                        กรอกข้อมูลครูผู้ดูแล ระบบจะสร้าง Link
                        สำหรับให้ครูผู้ดูแลใช้ในการตั้งรหัสผ่าน
                    </p>
                    <AddTeacherForm />
                </div>
            </div>
        </div>
    );
}
