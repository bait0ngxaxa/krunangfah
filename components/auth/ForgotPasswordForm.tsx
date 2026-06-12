"use client";

import Link from "next/link";
import { AlertCircle, Loader2, Mail } from "lucide-react";
import { useForgotPassword } from "@/hooks/useForgotPassword";
import {
    AUTH_INPUT_CLASS,
    AUTH_PRIMARY_BUTTON_CLASS,
    AUTH_TEXT_LINK_CLASS,
} from "@/components/auth/authStyles";

export function ForgotPasswordForm() {
    const {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        emailSent,
        serverError,
        onSubmit,
    } = useForgotPassword();

    if (emailSent) {
        return (
            <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                    <Mail
                        className="w-8 h-8 text-emerald-500"
                        aria-hidden="true"
                    />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                    ส่งลิงก์แล้ว
                </h3>
                <p className="text-sm text-gray-600">
                    กรุณาตรวจสอบอีเมลของคุณ หากอีเมลนี้มีอยู่ในระบบ
                    คุณจะได้รับลิงก์สำหรับรีเซ็ตรหัสผ่าน
                </p>
                <p className="text-xs text-gray-600">
                    ลิงก์จะหมดอายุภายใน 1 ชั่วโมง
                </p>
                <Link
                    href="/signin"
                    className={`mt-2 inline-block ${AUTH_TEXT_LINK_CLASS}`}
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
                    className="block text-base font-medium text-gray-700 mb-2"
                >
                    อีเมล
                </label>
                <input
                    {...register("email")}
                    type="email"
                    id="email"
                    autoComplete="email"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.email}
                    aria-describedby={
                        errors.email ? "forgot-email-error" : undefined
                    }
                    className={AUTH_INPUT_CLASS}
                    placeholder="your@email.com"
                />
                {errors.email && (
                    <p
                        id="forgot-email-error"
                        role="alert"
                        className="mt-1.5 text-sm font-medium text-red-600"
                    >
                        {errors.email.message}
                    </p>
                )}
            </div>

            {serverError && (
                <p
                    className="flex items-start gap-1.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600"
                    role="status"
                    aria-live="polite"
                >
                    <AlertCircle
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                    />
                    <span className="min-w-0 break-words">{serverError}</span>
                </p>
            )}

            <div className="flex justify-center pt-1">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className={AUTH_PRIMARY_BUTTON_CLASS}
                >
                    {isSubmitting && (
                        <Loader2
                            className="h-5 w-5 animate-spin"
                            aria-hidden="true"
                        />
                    )}
                    {isSubmitting ? "กำลังส่ง…" : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
                </button>
            </div>

            <div className="text-center">
                <Link
                    href="/signin"
                    className={AUTH_TEXT_LINK_CLASS}
                >
                    กลับไปหน้าเข้าสู่ระบบ
                </Link>
            </div>
        </form>
    );
}
