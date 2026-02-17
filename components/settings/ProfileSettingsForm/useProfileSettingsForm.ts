"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateTeacherProfile } from "@/lib/actions/profile.actions";
import {
    profileUpdateSchema,
    type ProfileUpdateFormData,
} from "@/lib/validations/profile.validation";
import type { UserProfileData } from "@/types/profile.types";

export function useProfileSettingsForm(initialData: UserProfileData) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<ProfileUpdateFormData>({
        resolver: zodResolver(profileUpdateSchema),
        defaultValues: {
            firstName: initialData.teacher.firstName,
            lastName: initialData.teacher.lastName,
            age: initialData.teacher.age,
            advisoryClass: initialData.teacher.advisoryClass,
            academicYearId: initialData.teacher.academicYearId,
            schoolRole: initialData.teacher.schoolRole,
            projectRole: initialData.teacher.projectRole,
        },
    });

    const onSubmit = async (data: ProfileUpdateFormData) => {
        setIsLoading(true);

        try {
            const result = await updateTeacherProfile(data);

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            router.push("/dashboard");
        } catch (error) {
            console.error("Profile update error:", error);
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    return { form, isLoading, onSubmit };
}
