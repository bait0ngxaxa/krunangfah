"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HandHelping } from "lucide-react";
import { toast } from "sonner";
import {
    acceptInviteSchema,
    type AcceptInviteFormData,
} from "@/lib/validations/teacher-invite.validation";
import { acceptTeacherInvite } from "@/lib/actions/teacher-invite";

interface AcceptInviteFormProps {
    token: string;
    inviteData: {
        firstName: string;
        lastName: string;
        email: string;
        school: { name: string };
    };
}

export function AcceptInviteForm({ token, inviteData }: AcceptInviteFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<AcceptInviteFormData>({
        resolver: zodResolver(acceptInviteSchema),
        defaultValues: { token },
    });

    const onSubmit = async (data: AcceptInviteFormData) => {
        setIsLoading(true);
        setError("");

        try {
            const result = await acceptTeacherInvite(token, data.password);

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success("ลงทะเบียนสำเร็จ");
            // รอ 1 วินาทีเพื่อให้เห็น toast
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // Redirect to sign in page
            router.push("/signin?registered=true");
        } catch (err) {
            console.error("Accept invite error:", err);
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Info Card */}
            <div className="bg-white/80 backdrop-blur-sm border border-emerald-200 rounded-2xl p-6 shadow-sm shadow-emerald-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-bl from-emerald-100 to-transparent rounded-bl-full opacity-50 pointer-events-none" />
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <HandHelping className="w-5 h-5 text-emerald-500" />{" "}
                    ข้อมูลของคุณ
                </h3>
                <div className="space-y-2 text-gray-600">
                    <p className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-500 w-16">
                            ชื่อ:
                        </span>
                        {inviteData.firstName} {inviteData.lastName}
                    </p>
                    <p className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-500 w-16">
                            อีเมล:
                        </span>
                        {inviteData.email}
                    </p>
                    <p className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-500 w-16">
                            โรงเรียน:
                        </span>
                        {inviteData.school.name}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                    <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl font-medium animate-shake">
                        {error}
                    </div>
                )}

                <input type="hidden" {...register("token")} />

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        ตั้งรหัสผ่าน <span className="text-red-500">*</span>
                    </label>
                    <input
                        {...register("password")}
                        type="password"
                        className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all placeholder:text-gray-400 hover:border-emerald-300"
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                    />
                    {errors.password && (
                        <p className="mt-1 text-sm text-red-500 font-medium">
                            {errors.password.message}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                    </label>
                    <input
                        {...register("confirmPassword")}
                        type="password"
                        className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all placeholder:text-gray-400 hover:border-emerald-300"
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
                    className="w-full py-3.5 px-4 bg-linear-to-r from-emerald-400 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 transition-all duration-200 shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300 transform hover:-translate-y-0.5"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            กำลังลงทะเบียน...
                        </span>
                    ) : (
                        "ลงทะเบียนเข้าร่วมโครงการ"
                    )}
                </button>
            </form>
        </div>
    );
}
