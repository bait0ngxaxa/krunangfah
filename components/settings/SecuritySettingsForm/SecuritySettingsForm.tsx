"use client";

import { AlertTriangle } from "lucide-react";
import { useSecuritySettingsForm } from "./useSecuritySettingsForm";
import { PasswordFields } from "./components";

export function SecuritySettingsForm() {
    const { form, isLoading, onSubmit } = useSecuritySettingsForm();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = form;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Warning Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                        <p className="font-semibold mb-1">⚠️ คำเตือนสำคัญ</p>
                        <p>
                            หลังจากเปลี่ยนรหัสผ่านสำเร็จ
                            คุณจะต้องเข้าสู่ระบบใหม่ด้วยรหัสผ่านที่เปลี่ยนแปลง
                        </p>
                    </div>
                </div>
            </div>

            {/* Password Fields */}
            <PasswordFields register={register} errors={errors} />

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-linear-to-r from-pink-500 to-rose-500 text-white text-lg font-bold py-3.5 px-4 rounded-xl hover:from-pink-600 hover:to-rose-600 focus:outline-none focus:ring-4 focus:ring-pink-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-pink-200 hover:shadow-xl hover:shadow-pink-300"
            >
                {isLoading ? "กำลังเปลี่ยนรหัสผ่าน..." : "เปลี่ยนรหัสผ่าน"}
            </button>
        </form>
    );
}
