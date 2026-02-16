"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
    teacherInviteSchema,
    type TeacherInviteFormData,
} from "@/lib/validations/teacher-invite.validation";
import { createTeacherInvite } from "@/lib/actions/teacher-invite";
import { ADMIN_ADVISORY_CLASS } from "./constants";
import type { AcademicYear, UseAddTeacherFormReturn } from "./types";

export function useAddTeacherForm(
    academicYears: AcademicYear[],
): UseAddTeacherFormReturn {
    const router = useRouter();

    // === State ===
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [inviteLink, setInviteLink] = useState("");

    // === Form Setup ===
    const form = useForm<TeacherInviteFormData>({
        resolver: zodResolver(teacherInviteSchema),
    });

    // === Computed Values ===
    const userRoleValue = form.watch("userRole") || "";
    const advisoryClassValue = form.watch("advisoryClass") || "";

    useEffect(() => {
        if (userRoleValue === "school_admin") {
            form.setValue("advisoryClass", ADMIN_ADVISORY_CLASS, {
                shouldValidate: true,
            });
        } else if (
            userRoleValue === "class_teacher" &&
            advisoryClassValue === ADMIN_ADVISORY_CLASS
        ) {
            form.setValue("advisoryClass", "", { shouldValidate: false });
        }
    }, [userRoleValue, form, advisoryClassValue]);

    // === Handlers ===
    const onSubmit = async (data: TeacherInviteFormData): Promise<void> => {
        setIsLoading(true);
        setError("");
        setSuccess("");
        setInviteLink("");

        try {
            const result = await createTeacherInvite(data);

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success("สร้างคำเชิญสำเร็จ!");
            setSuccess("สร้างคำเชิญสำเร็จ!");
            if (result.inviteLink) {
                setInviteLink(result.inviteLink);
            }
            form.reset();
        } catch (err) {
            console.error("Create invite error:", err);
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (): void => {
        navigator.clipboard.writeText(inviteLink);
        toast.success("คัดลอก Link แล้ว!");
    };

    const handleCancel = (): void => {
        router.back();
    };

    return {
        form,
        isLoading,
        error,
        success,
        inviteLink,
        academicYears,
        userRoleValue,
        advisoryClassValue,
        onSubmit,
        copyToClipboard,
        handleCancel,
    };
}
