"use client";

import { useResetPassword } from "@/hooks/useResetPassword";

interface ResetPasswordFormProps {
    token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
    const {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        onSubmit,
    } = useResetPassword(token);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Hidden token field */}
            <input type="hidden" {...register("token")} />

            <div>
                <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-600 mb-2"
                >
                    รหัสผ่านใหม่
                </label>
                <input
                    {...register("password")}
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-pink-100 rounded-xl focus:ring-4 focus:ring-pink-100/50 focus:border-pink-300 bg-white/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none text-black placeholder:text-gray-600"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                />
                {errors.password && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.password.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-600 mb-2"
                >
                    ยืนยันรหัสผ่านใหม่
                </label>
                <input
                    {...register("confirmPassword")}
                    type="password"
                    id="confirmPassword"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-pink-100 rounded-xl focus:ring-4 focus:ring-pink-100/50 focus:border-pink-300 bg-white/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none text-black placeholder:text-gray-600"
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                />
                {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.confirmPassword.message}
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-linear-to-r from-pink-50 to-white text-pink-600 text-lg font-bold py-3.5 px-4 rounded-full border border-pink-200 hover:from-pink-100 hover:to-white focus:outline-none focus:ring-4 focus:ring-pink-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-pink-100 hover:shadow-xl hover:shadow-pink-200 hover:-translate-y-0.5"
            >
                {isSubmitting ? "กำลังรีเซ็ต..." : "ตั้งรหัสผ่านใหม่"}
            </button>
        </form>
    );
}
