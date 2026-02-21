"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
    signInSchema,
    type SignInFormData,
} from "@/lib/validations/auth.validation";
import { checkSignInRateLimit } from "@/lib/actions/auth.actions";

interface SignInFormProps {
    callbackUrl?: string;
}

export function SignInForm({ callbackUrl = "/" }: SignInFormProps) {
    const router = useRouter();
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignInFormData>({
        resolver: zodResolver(signInSchema),
    });

    const onSubmit = async (data: SignInFormData) => {
        setIsLoading(true);
        setError("");

        try {
            // Check rate limit first (server-side)
            const rateLimitCheck = await checkSignInRateLimit();

            if (!rateLimitCheck.allowed) {
                toast.error(rateLimitCheck.message || "ส่งคำขอมากเกินไป");
                return;
            }

            // Proceed with signin if rate limit allows
            const result = await signIn("credentials", {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (result?.error) {
                toast.error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
                return;
            }

            toast.success("เข้าสู่ระบบสำเร็จ");
            router.push(callbackUrl);
            router.refresh();
        } catch (err) {
            console.error("Sign in error:", err);
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                    disabled={isLoading}
                    className="w-full px-4 py-3.5 border-2 border-emerald-300 rounded-full focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none text-gray-800 placeholder:text-gray-400"
                    placeholder="your@email.com"
                />
                {errors.email && (
                    <p className="mt-1.5 text-sm text-red-500 font-medium">
                        {errors.email.message}
                    </p>
                )}
            </div>

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
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="w-full px-4 py-3.5 border-2 border-emerald-300 rounded-full focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none text-gray-800 placeholder:text-gray-400"
                    placeholder="••••••••"
                />
                {errors.password && (
                    <p className="mt-1.5 text-sm text-red-500 font-medium">
                        {errors.password.message}
                    </p>
                )}
                <div className="mt-2 text-right">
                    <Link
                        href="/forgot-password"
                        className="text-sm text-emerald-500 hover:text-emerald-600 font-medium transition-colors"
                    >
                        ลืมรหัสผ่าน?
                    </Link>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
            )}

            <div className="flex justify-center pt-1">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#00DB87] hover:bg-[#00c078] text-white text-lg font-bold py-3 px-12 rounded-full focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                >
                    {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </button>
            </div>

            <p className="text-center text-sm text-gray-500 pt-1">
                ยังไม่มีบัญชี? ติดต่อผู้ดูแล
            </p>
        </form>
    );
}
