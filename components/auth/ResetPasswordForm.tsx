"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useResetPassword } from "@/hooks/useResetPassword";
import {
    AUTH_INPUT_CLASS,
    AUTH_PRIMARY_BUTTON_CLASS,
} from "@/components/auth/authStyles";

interface ResetPasswordFormProps {
    token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
    const { register, handleSubmit, errors, isSubmitting, serverError, onSubmit } =
        useResetPassword(token);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Hidden token field */}
            <input type="hidden" {...register("token")} />

            <div>
                <label
                    htmlFor="password"
                    className="block text-base font-medium text-gray-700 mb-2"
                >
                    รหัสผ่านใหม่
                </label>
                <input
                    {...register("password")}
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.password}
                    aria-describedby={
                        errors.password ? "reset-password-error" : undefined
                    }
                    className={AUTH_INPUT_CLASS}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                />
                {errors.password && (
                    <p
                        id="reset-password-error"
                        role="alert"
                        className="mt-1.5 text-sm font-medium text-red-600"
                    >
                        {errors.password.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="confirmPassword"
                    className="block text-base font-medium text-gray-700 mb-2"
                >
                    ยืนยันรหัสผ่านใหม่
                </label>
                <input
                    {...register("confirmPassword")}
                    type="password"
                    id="confirmPassword"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={
                        errors.confirmPassword
                            ? "reset-confirm-password-error"
                            : undefined
                    }
                    className={AUTH_INPUT_CLASS}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                />
                {errors.confirmPassword && (
                    <p
                        id="reset-confirm-password-error"
                        role="alert"
                        className="mt-1.5 text-sm font-medium text-red-600"
                    >
                        {errors.confirmPassword.message}
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
                    {isSubmitting ? "กำลังรีเซ็ต…" : "ตั้งรหัสผ่านใหม่"}
                </button>
            </div>
        </form>
    );
}
