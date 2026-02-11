"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
    resetPasswordSchema,
    type ResetPasswordFormData,
} from "@/lib/validations/auth.validation";
import { resetPassword } from "@/lib/actions/forgot-password.actions";

interface UseResetPasswordReturn {
    register: ReturnType<typeof useForm<ResetPasswordFormData>>["register"];
    handleSubmit: ReturnType<typeof useForm<ResetPasswordFormData>>["handleSubmit"];
    errors: ReturnType<typeof useForm<ResetPasswordFormData>>["formState"]["errors"];
    isSubmitting: boolean;
    onSubmit: (data: ResetPasswordFormData) => Promise<void>;
}

export function useResetPassword(token: string): UseResetPasswordReturn {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { token },
    });

    const onSubmit = async (data: ResetPasswordFormData): Promise<void> => {
        setIsSubmitting(true);

        try {
            const result = await resetPassword({
                token: data.token,
                password: data.password,
                confirmPassword: data.confirmPassword,
            });

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            router.push("/signin");
        } catch {
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        onSubmit,
    };
}
