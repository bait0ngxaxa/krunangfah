"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import { changePassword } from "@/lib/actions/security.actions";
import {
    passwordChangeSchema,
    type PasswordChangeFormData,
} from "@/lib/validations/profile.validation";

export function useSecuritySettingsForm() {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<PasswordChangeFormData>({
        resolver: zodResolver(passwordChangeSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: PasswordChangeFormData) => {
        setIsLoading(true);

        try {
            const result = await changePassword(data);

            if (!result.success) {
                toast.error(result.message);
                setIsLoading(false);
                return;
            }

            // Success: sign out and redirect to signin
            toast.success(result.message);
            await signOut({ redirect: true, callbackUrl: "/signin" });
        } catch (error) {
            console.error("Password change error:", error);
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
            setIsLoading(false);
        }
    };

    return { form, isLoading, onSubmit };
}
