"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    signUpSchema,
    type SignUpFormData,
} from "@/lib/validations/auth.validation";
import { registerUser } from "@/lib/actions/auth.actions";
import { signIn } from "next-auth/react";

export function SignUpForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignUpFormData>({
        resolver: zodResolver(signUpSchema),
    });

    const onSubmit = async (data: SignUpFormData) => {
        setIsLoading(true);
        setError("");

        try {
            const result = await registerUser({
                name: data.name,
                email: data.email,
                password: data.password,
                schoolName: data.schoolName,
            });

            if (!result.success) {
                setError(result.message);
                return;
            }

            // Auto sign in after registration
            const signInResult = await signIn("credentials", {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (signInResult?.error) {
                setError("ลงทะเบียนสำเร็จ แต่เข้าสู่ระบบไม่ได้");
                return;
            }

            router.push("/dashboard");
            router.refresh();
        } catch (err) {
            console.error("Sign up error:", err);
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl text-center">
                    {error}
                </div>
            )}

            <div>
                <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    ชื่อผู้ใช้
                </label>
                <input
                    {...register("name")}
                    type="text"
                    id="name"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-300 transition-all outline-none"
                    placeholder="กรอกชื่อผู้ใช้ของคุณ"
                />
                {errors.name && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.name.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    อีเมล
                </label>
                <input
                    {...register("email")}
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-300 transition-all outline-none"
                    placeholder="example@email.com"
                />
                {errors.email && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.email.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="schoolName"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    ชื่อโรงเรียน
                </label>
                <input
                    {...register("schoolName")}
                    type="text"
                    id="schoolName"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-300 transition-all outline-none"
                    placeholder="เช่น โรงเรียนสาธิต"
                />
                {errors.schoolName && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.schoolName.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    รหัสผ่าน
                </label>
                <input
                    {...register("password")}
                    type="password"
                    id="password"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-300 transition-all outline-none"
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
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    ยืนยันรหัสผ่าน
                </label>
                <input
                    {...register("confirmPassword")}
                    type="password"
                    id="confirmPassword"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-300 transition-all outline-none"
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
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-linear-to-r from-pink-400 to-purple-400 text-white text-lg font-bold rounded-full hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-pink-200"
            >
                {isLoading ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
            </button>
        </form>
    );
}
