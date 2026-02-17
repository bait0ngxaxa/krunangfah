import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type { PasswordChangeFormData } from "@/lib/validations/profile.validation";

interface PasswordFieldsProps {
    register: UseFormRegister<PasswordChangeFormData>;
    errors: FieldErrors<PasswordChangeFormData>;
}

export function PasswordFields({ register, errors }: PasswordFieldsProps) {
    return (
        <>
            {/* Current Password */}
            <div>
                <label
                    htmlFor="currentPassword"
                    className="block text-sm font-bold text-gray-700 mb-2"
                >
                    รหัสผ่านปัจจุบัน{" "}
                    <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("currentPassword")}
                    type="password"
                    id="currentPassword"
                    autoComplete="current-password"
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 transition-all outline-none"
                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                />
                {errors.currentPassword && (
                    <p
                        className="mt-1 text-sm text-red-500 font-medium"
                        role="alert"
                    >
                        {errors.currentPassword.message}
                    </p>
                )}
            </div>

            {/* New Password */}
            <div>
                <label
                    htmlFor="newPassword"
                    className="block text-sm font-bold text-gray-700 mb-2"
                >
                    รหัสผ่านใหม่ <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("newPassword")}
                    type="password"
                    id="newPassword"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 transition-all outline-none"
                    placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                />
                {errors.newPassword && (
                    <p
                        className="mt-1 text-sm text-red-500 font-medium"
                        role="alert"
                    >
                        {errors.newPassword.message}
                    </p>
                )}
            </div>

            {/* Confirm Password */}
            <div>
                <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-bold text-gray-700 mb-2"
                >
                    ยืนยันรหัสผ่านใหม่{" "}
                    <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("confirmPassword")}
                    type="password"
                    id="confirmPassword"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 transition-all outline-none"
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                />
                {errors.confirmPassword && (
                    <p
                        className="mt-1 text-sm text-red-500 font-medium"
                        role="alert"
                    >
                        {errors.confirmPassword.message}
                    </p>
                )}
            </div>
        </>
    );
}
