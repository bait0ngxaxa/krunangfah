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
    redirectTo?: string;
}

export function InviteRegisterForm({
    token,
    email,
    redirectTo: defaultRedirectTo = "/teacher-profile",
}: InviteRegisterFormProps) {
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

        const destination = result.redirectTo ?? defaultRedirectTo;
        router.push(destination);
        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email (read-only) */}
            <div>
                <label
                    htmlFor="email"
                    className="block text-base font-medium text-gray-700 mb-2"
                >
                    อีเมล
                </label>
                <input
                    id="email"
                    type="email"
                    readOnly
                    value={email}
                    className="w-full px-4 py-3.5 border-2 border-emerald-100 rounded-full bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                />
            </div>

            {/* Password */}
            <div>
                <label
                    htmlFor="password"
                    className="block text-base font-medium text-gray-700 mb-2"
                >
                    รหัสผ่าน
                </label>
                <input
                    {...register("password")}
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="w-full px-4 py-3.5 border-2 border-emerald-300 rounded-full focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none text-gray-800 placeholder:text-gray-400"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                />
                {errors.password && (
                    <p className="mt-1.5 text-sm text-red-500 font-medium">
                        {errors.password.message}
                    </p>
                )}
            </div>

            {/* Confirm Password */}
            <div>
                <label
                    htmlFor="confirmPassword"
                    className="block text-base font-medium text-gray-700 mb-2"
                >
                    ยืนยันรหัสผ่าน
                </label>
                <input
                    {...register("confirmPassword")}
                    type="password"
                    id="confirmPassword"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="w-full px-4 py-3.5 border-2 border-emerald-300 rounded-full focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none text-gray-800 placeholder:text-gray-400"
                    placeholder="••••••••"
                />
                {errors.confirmPassword && (
                    <p className="mt-1.5 text-sm text-red-500 font-medium">
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

            <div className="flex justify-center pt-2">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#00DB87] hover:bg-[#00c078] text-white text-lg font-bold py-3 px-12 rounded-full focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                >
                    {isLoading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
                </button>
            </div>
        </form>
    );
}
