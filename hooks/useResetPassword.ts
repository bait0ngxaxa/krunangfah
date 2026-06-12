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
    serverError: string | null;
    onSubmit: (data: ResetPasswordFormData) => Promise<void>;
}

export function useResetPassword(token: string): UseResetPasswordReturn {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

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
        setServerError(null);

        try {
            const result = await resetPassword({
                token: data.token,
                password: data.password,
                confirmPassword: data.confirmPassword,
            });

            if (!result.success) {
                setServerError(result.message);
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            router.push("/signin");
        } catch {
            const message = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
            setServerError(message);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        serverError,
        onSubmit,
    };
}
