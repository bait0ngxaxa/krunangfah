/**
 * Type definitions for TeacherProfileForm
 */

import type {
    UseFormReturn,
    UseFormRegister,
    FieldErrors,
} from "react-hook-form";
import type { TeacherProfileFormData } from "@/lib/validations/teacher.validation";
import type { AcademicYear } from "@/types/teacher.types";

// Re-export for convenience
export type { TeacherProfileFormData, AcademicYear };

export interface UseTeacherProfileFormReturn {
    form: UseFormReturn<TeacherProfileFormData>;
    isLoading: boolean;
    error: string;
    academicYears: AcademicYear[];
    onSubmit: (data: TeacherProfileFormData) => Promise<void>;
}

export interface ErrorMessageProps {
    error: string;
}

export interface NameFieldsProps {
    register: UseFormRegister<TeacherProfileFormData>;
    errors: FieldErrors<TeacherProfileFormData>;
}

export interface SchoolInfoFieldsProps {
    register: UseFormRegister<TeacherProfileFormData>;
    errors: FieldErrors<TeacherProfileFormData>;
}

export interface ProjectFieldsProps {
    register: UseFormRegister<TeacherProfileFormData>;
    errors: FieldErrors<TeacherProfileFormData>;
    academicYears: AcademicYear[];
}

export interface SubmitButtonProps {
    isLoading: boolean;
}
