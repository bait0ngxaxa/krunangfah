"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    teacherProfileSchema,
    type TeacherProfileFormData,
} from "@/lib/validations/teacher.validation";
import { createTeacherProfile } from "@/lib/actions/teacher.actions";
import { DEFAULT_ADVISORY_CLASS } from "./constants";
import type { AcademicYear, UseTeacherProfileFormReturn } from "./types";

export function useTeacherProfileForm(
    academicYears: AcademicYear[],
): UseTeacherProfileFormReturn {
    const router = useRouter();

    // === State ===
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // === Form Setup ===
    const form = useForm<TeacherProfileFormData>({
        resolver: zodResolver(teacherProfileSchema),
        defaultValues: {
            advisoryClass: DEFAULT_ADVISORY_CLASS,
        },
    });

    // === Handlers ===
    const onSubmit = async (data: TeacherProfileFormData): Promise<void> => {
        setIsLoading(true);
        setError("");

        try {
            const result = await createTeacherProfile(data);

            if (!result.success) {
                setError(result.message);
                return;
            }

            // Navigate to dashboard — (protected) layout checks DB directly
            // so no JWT refresh needed
            router.push("/dashboard");
        } catch (err) {
            console.error("Create teacher profile error:", err);
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    return {
        form,
        isLoading,
        error,
        academicYears,
        onSubmit,
    };
}
