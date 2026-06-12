"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
    forgotPasswordSchema,
    type ForgotPasswordFormData,
} from "@/lib/validations/auth.validation";
import { requestPasswordReset } from "@/lib/actions/forgot-password.actions";

interface UseForgotPasswordReturn {
    register: ReturnType<typeof useForm<ForgotPasswordFormData>>["register"];
    handleSubmit: ReturnType<typeof useForm<ForgotPasswordFormData>>["handleSubmit"];
    errors: ReturnType<typeof useForm<ForgotPasswordFormData>>["formState"]["errors"];
    isSubmitting: boolean;
    emailSent: boolean;
    serverError: string | null;
    onSubmit: (data: ForgotPasswordFormData) => Promise<void>;
}

export function useForgotPassword(): UseForgotPasswordReturn {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordFormData): Promise<void> => {
        setIsSubmitting(true);
        setServerError(null);

        try {
            const result = await requestPasswordReset({ email: data.email });

            if (!result.success) {
                setServerError(result.message);
                toast.error(result.message);
                return;
            }

            setEmailSent(true);
            toast.success(result.message);
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
        emailSent,
        serverError,
        onSubmit,
    };
}
