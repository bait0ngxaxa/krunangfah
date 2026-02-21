"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useForgotPassword } from "@/hooks/useForgotPassword";

export function ForgotPasswordForm() {
    const {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        emailSent,
        onSubmit,
    } = useForgotPassword();

    if (emailSent) {
        return (
            <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                    <Mail className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                    ส่งลิงก์แล้ว
                </h3>
                <p className="text-sm text-gray-600">
                    กรุณาตรวจสอบอีเมลของคุณ หากอีเมลนี้มีอยู่ในระบบ
                    คุณจะได้รับลิงก์สำหรับรีเซ็ตรหัสผ่าน
                </p>
                <p className="text-xs text-gray-400">
                    ลิงก์จะหมดอายุภายใน 1 ชั่วโมง
                </p>
                <Link
                    href="/signin"
                    className="inline-block mt-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                    กลับไปหน้าเข้าสู่ระบบ
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
                <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-600 mb-2"
                >
                    อีเมล
                </label>
                <input
                    {...register("email")}
                    type="email"
                    id="email"
                    autoComplete="email"
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-emerald-100 rounded-xl focus:ring-4 focus:ring-emerald-100/50 focus:border-emerald-300 bg-white/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none text-black placeholder:text-gray-600"
                    placeholder="your@email.com"
                />
                {errors.email && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.email.message}
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-linear-to-r from-emerald-50 to-white text-emerald-600 text-lg font-bold py-3.5 px-4 rounded-full border border-emerald-200 hover:from-emerald-100 hover:to-white focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-emerald-100 hover:shadow-xl hover:shadow-emerald-200 hover:-translate-y-0.5"
            >
                {isSubmitting ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
            </button>

            <div className="text-center">
                <Link
                    href="/signin"
                    className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                    กลับไปหน้าเข้าสู่ระบบ
                </Link>
            </div>
        </form>
    );
}
