"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    inviteRegisterSchema,
    type InviteRegisterFormData,
} from "@/lib/validations/auth.validation";
import { acceptSchoolAdminInvite } from "@/lib/actions/school-admin-invite.actions";

interface InviteRegisterFormProps {
    token: string;
    email: string;
}

export function InviteRegisterForm({ token, email }: InviteRegisterFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<InviteRegisterFormData>({
        resolver: zodResolver(inviteRegisterSchema),
    });

    const onSubmit = async (data: InviteRegisterFormData) => {
        setIsLoading(true);
        setServerError(null);

        const result = await acceptSchoolAdminInvite(token, data.password);

        if (!result.success) {
            setServerError(result.message);
            setIsLoading(false);
            return;
        }

        toast.success("สร้างบัญชีสำเร็จ กำลังเข้าสู่ระบบ...");

        const signInResult = await signIn("credentials", {
            email,
            password: data.password,
            redirect: false,
        });

        if (signInResult?.error) {
            toast.error("สร้างบัญชีสำเร็จ กรุณาเข้าสู่ระบบด้วยตัวเอง");
            router.push("/signin");
            return;
        }

        router.push("/school-setup");
        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email (read-only) */}
            <div>
                <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-600 mb-2"
                >
                    อีเมล
                </label>
                <input
                    id="email"
                    type="email"
                    readOnly
                    value={email}
                    className="w-full px-4 py-3 border border-pink-100 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                />
            </div>

            {/* Password */}
            <div>
                <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    รหัสผ่าน
                </label>
                <input
                    {...register("password")}
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full px-4 py-3 border border-pink-100 rounded-xl focus:ring-4 focus:ring-pink-100/50 focus:border-pink-300 bg-white/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none text-black placeholder:text-gray-400"
                />
                {errors.password && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.password.message}
                    </p>
                )}
            </div>

            {/* Confirm Password */}
            <div>
                <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    ยืนยันรหัสผ่าน
                </label>
                <input
                    {...register("confirmPassword")}
                    type="password"
                    id="confirmPassword"
                    autoComplete="new-password"
                    disabled={isLoading}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-pink-100 rounded-xl focus:ring-4 focus:ring-pink-100/50 focus:border-pink-300 bg-white/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none text-black placeholder:text-gray-400"
                />
                {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.confirmPassword.message}
                    </p>
                )}
            </div>

            {serverError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600 text-center">
                        {serverError}
                    </p>
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-linear-to-r from-pink-50 to-white text-pink-600 text-lg font-bold py-3.5 px-4 rounded-full border border-pink-200 hover:from-pink-100 hover:to-white focus:outline-none focus:ring-4 focus:ring-pink-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-pink-100 hover:shadow-xl hover:shadow-pink-200 hover:-translate-y-0.5 cursor-pointer"
            >
                {isLoading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
            </button>
        </form>
    );
}
