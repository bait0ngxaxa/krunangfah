"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, HandHelping, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AUTH_PRIMARY_BUTTON_CLASS } from "@/components/auth/authStyles";
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

    const onSubmit = async (data: AcceptInviteFormData): Promise<void> => {
        if (isLoading) return;

        setIsLoading(true);
        setError("");

        try {
            const result = await acceptTeacherInvite(token, data.password);

            if (!result.success) {
                setError(result.message);
                toast.error(result.message);
                return;
            }

            toast.success("ลงทะเบียนสำเร็จ");
            // รอ 1 วินาทีเพื่อให้เห็น toast
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // Redirect to sign in page
            router.push("/signin?registered=true");
        } catch {
            const message = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Info Card */}
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <HandHelping
                        className="w-5 h-5 text-emerald-500"
                        aria-hidden="true"
                    />
                    ข้อมูลของคุณ
                </h3>
                <div className="space-y-2 text-gray-700">
                    <p className="flex items-start gap-2">
                        <span className="w-16 shrink-0 font-semibold text-emerald-700">
                            ชื่อ:
                        </span>
                        <span className="min-w-0 break-words">
                            {inviteData.firstName} {inviteData.lastName}
                        </span>
                    </p>
                    <p className="flex items-start gap-2">
                        <span className="w-16 shrink-0 font-semibold text-emerald-700">
                            อีเมล:
                        </span>
                        <span className="min-w-0 break-all" dir="auto">
                            {inviteData.email}
                        </span>
                    </p>
                    <p className="flex items-start gap-2">
                        <span className="w-16 shrink-0 font-semibold text-emerald-700">
                            โรงเรียน:
                        </span>
                        <span className="min-w-0 break-words">
                            {inviteData.school.name}
                        </span>
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                    <div
                        className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600"
                        role="status"
                        aria-live="polite"
                    >
                        <p className="flex items-start gap-1.5">
                            <AlertCircle
                                className="mt-0.5 h-4 w-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span className="min-w-0 break-words">
                                {error}
                            </span>
                        </p>
                    </div>
                )}

                <input type="hidden" {...register("token")} />

                <div>
                    <label
                        htmlFor="teacher-invite-password"
                        className="block text-sm font-bold text-gray-700 mb-2"
                    >
                        ตั้งรหัสผ่าน <span className="text-red-500">*</span>
                    </label>
                    <input
                        {...register("password")}
                        id="teacher-invite-password"
                        type="password"
                        autoComplete="new-password"
                        disabled={isLoading}
                        aria-invalid={!!errors.password}
                        aria-describedby={
                            errors.password
                                ? "teacher-invite-password-error"
                                : undefined
                        }
                        className="w-full rounded-xl border border-emerald-200 px-4 py-3 outline-none transition-base placeholder:text-gray-500 hover:border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                    />
                    {errors.password && (
                        <p
                            id="teacher-invite-password-error"
                            role="alert"
                            className="mt-1 text-sm font-medium text-red-600"
                        >
                            {errors.password.message}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="teacher-invite-confirm-password"
                        className="block text-sm font-bold text-gray-700 mb-2"
                    >
                        ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                    </label>
                    <input
                        {...register("confirmPassword")}
                        id="teacher-invite-confirm-password"
                        type="password"
                        autoComplete="new-password"
                        disabled={isLoading}
                        aria-invalid={!!errors.confirmPassword}
                        aria-describedby={
                            errors.confirmPassword
                                ? "teacher-invite-confirm-password-error"
                                : undefined
                        }
                        className="w-full rounded-xl border border-emerald-200 px-4 py-3 outline-none transition-base placeholder:text-gray-500 hover:border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                    />
                    {errors.confirmPassword && (
                        <p
                            id="teacher-invite-confirm-password-error"
                            role="alert"
                            className="mt-1 text-sm font-medium text-red-600"
                        >
                            {errors.confirmPassword.message}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    aria-busy={isLoading}
                    className={`${AUTH_PRIMARY_BUTTON_CLASS} sm:w-full`}
                >
                    {isLoading && (
                        <Loader2
                            className="h-5 w-5 animate-spin"
                            aria-hidden="true"
                        />
                    )}
                    {isLoading
                        ? "กำลังลงทะเบียน…"
                        : "ลงทะเบียนเข้าร่วมโครงการ"}
                </button>
            </form>
        </div>
    );
}
