"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    signInSchema,
    type SignInFormData,
} from "@/lib/validations/auth.validation";

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
                <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    อีเมล
                </label>
                <input
                    {...register("email")}
                    type="email"
                    id="email"
                    autoComplete="email"
                    disabled={isLoading}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none"
                    placeholder="your@email.com"
                />
                {errors.email && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.email.message}
                    </p>
                )}
            </div>

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
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none"
                    placeholder="••••••••"
                />
                {errors.password && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.password.message}
                    </p>
                )}
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-linear-to-r from-pink-400 to-purple-400 text-white text-lg font-bold py-3.5 px-4 rounded-full hover:from-pink-500 hover:to-purple-500 focus:outline-none focus:ring-4 focus:ring-pink-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
                {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
        </form>
    );
}
