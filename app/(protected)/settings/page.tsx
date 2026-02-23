import { requireAuth } from "@/lib/session";
import { SecuritySettingsForm } from "@/components/settings";
import { Lock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ตั้งค่าบัญชี | ครูนางฟ้า",
    description: "เปลี่ยนรหัสผ่านของคุณ",
};

export default async function SettingsPage() {
    await requireAuth();

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-12">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-6 mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">
                        ตั้งค่าบัญชี
                    </h1>
                    <p className="text-gray-600 mt-2">
                        เปลี่ยนรหัสผ่านของคุณ
                    </p>
                </div>

                {/* Password Change */}
                <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <Lock className="w-5 h-5 text-gray-700" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            เปลี่ยนรหัสผ่าน
                        </h2>
                    </div>
                    <SecuritySettingsForm />
                </div>
            </div>
        </div>
    );
}
