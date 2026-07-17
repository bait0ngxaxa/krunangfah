"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
    teacherInviteSchema,
    type TeacherInviteFormData,
} from "@/lib/validations/teacher-invite.validation";
import { createTeacherInvite } from "@/lib/actions/teacher-invite";
import { ADMIN_ADVISORY_CLASS } from "./constants";
import type {
    TeacherRosterItem,
    UseAddTeacherFormReturn,
} from "./types";

export function useAddTeacherForm(): UseAddTeacherFormReturn {
    const router = useRouter();

    // === State ===
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [inviteLink, setInviteLink] = useState("");
    const [selectedRosterId, setSelectedRosterId] = useState("");

    // === Form Setup ===
    const form = useForm<TeacherInviteFormData>({
        resolver: zodResolver(teacherInviteSchema),
    });

    // === Computed Values ===
    const userRoleValue =
        useWatch({ control: form.control, name: "userRole" }) || "";
    const advisoryClassValue =
        useWatch({ control: form.control, name: "advisoryClass" }) || "";

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

    /**
     * Select a teacher from the roster and pre-fill form fields
     */
    const onSelectRoster = (id: string, roster: TeacherRosterItem[]): void => {
        if (isLoading) {
            return;
        }

        setSelectedRosterId(id);

        if (!id) {
            // Reset to manual entry
            form.reset();
            return;
        }

        const teacher = roster.find((t) => t.id === id);
        if (!teacher) return;

        // Pre-fill all fields from roster
        form.setValue("firstName", teacher.firstName, { shouldValidate: true });
        form.setValue("lastName", teacher.lastName, { shouldValidate: true });
        form.setValue("age", String(teacher.age), { shouldValidate: true });
        form.setValue(
            "userRole",
            teacher.userRole as "school_admin" | "class_teacher",
            {
                shouldValidate: true,
            },
        );
        form.setValue("advisoryClass", teacher.advisoryClass, {
            shouldValidate: true,
        });
        form.setValue("schoolRole", teacher.schoolRole, {
            shouldValidate: true,
        });
        form.setValue(
            "projectRole",
            teacher.projectRole as "lead" | "care" | "coordinate",
            {
                shouldValidate: true,
            },
        );
        form.setValue("email", teacher.email ?? "", { shouldValidate: true });
    };

    const onSubmit = async (data: TeacherInviteFormData): Promise<void> => {
        if (isLoading) {
            return;
        }

        setIsLoading(true);
        setError("");
        setSuccess("");
        setInviteLink("");

        try {
            const result = await createTeacherInvite(
                data,
                selectedRosterId || undefined,
            );

            if (!result.success) {
                setError(result.message);
                toast.error(result.message);
                return;
            }

            toast.success("สร้างคำเชิญสำเร็จ!");
            setSuccess("สร้างคำเชิญสำเร็จ!");
            if (result.inviteLink) {
                setInviteLink(result.inviteLink);
            }

            if (selectedRosterId) {
                setSelectedRosterId("");
            }

            form.reset();

            // Re-fetch server data so invite list and roster dropdown update
            router.refresh();
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = async (): Promise<void> => {
        if (!inviteLink) {
            return;
        }

        try {
            await navigator.clipboard.writeText(inviteLink);
            toast.success("คัดลอก Link แล้ว!");
        } catch {
            setError("ไม่สามารถคัดลอก Link ได้ กรุณาคัดลอกจากช่องข้อความ");
            toast.error("ไม่สามารถคัดลอก Link ได้ กรุณาคัดลอกจากช่องข้อความ");
        }
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
        userRoleValue,
        advisoryClassValue,
        selectedRosterId,
        onSelectRoster,
        onSubmit,
        copyToClipboard,
        handleCancel,
    };
}
