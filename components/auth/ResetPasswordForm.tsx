"use client";

import { useResetPassword } from "@/hooks/useResetPassword";

interface ResetPasswordFormProps {
    token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } =
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
                    className="w-full px-4 py-3.5 border-2 border-emerald-300 rounded-full focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none text-gray-800 placeholder:text-gray-400"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                />
                {errors.password && (
                    <p className="mt-1.5 text-sm text-red-500 font-medium">
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
                    className="w-full px-4 py-3.5 border-2 border-emerald-300 rounded-full focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none text-gray-800 placeholder:text-gray-400"
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                />
                {errors.confirmPassword && (
                    <p className="mt-1.5 text-sm text-red-500 font-medium">
                        {errors.confirmPassword.message}
                    </p>
                )}
            </div>

            <div className="flex justify-center pt-1">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#00DB87] hover:bg-[#00c078] text-white text-lg font-bold py-3 px-12 rounded-full focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                >
                    {isSubmitting ? "กำลังรีเซ็ต..." : "ตั้งรหัสผ่านใหม่"}
                </button>
            </div>
        </form>
    );
}
