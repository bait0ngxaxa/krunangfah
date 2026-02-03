/**
 * Type definitions for AddTeacherForm
 */

import type {
    UseFormReturn,
    UseFormRegister,
    FieldErrors,
} from "react-hook-form";
import type { TeacherInviteFormData } from "@/lib/validations/teacher-invite.validation";

// Re-export for convenience
export type { TeacherInviteFormData };

export interface AcademicYear {
    id: string;
    year: number;
    semester: number;
}

export interface UseAddTeacherFormReturn {
    form: UseFormReturn<TeacherInviteFormData>;
    isLoading: boolean;
    error: string;
    success: string;
    inviteLink: string;
    academicYears: AcademicYear[];
    userRoleValue: string;
    advisoryClassValue: string;
    onSubmit: (data: TeacherInviteFormData) => Promise<void>;
    copyToClipboard: () => void;
    handleCancel: () => void;
}

export interface ErrorMessageProps {
    error: string;
}

export interface InviteLinkSectionProps {
    success: string;
    inviteLink: string;
    onCopy: () => void;
}

export interface PersonalInfoFieldsProps {
    register: UseFormRegister<TeacherInviteFormData>;
    errors: FieldErrors<TeacherInviteFormData>;
}

export interface RoleSelectionFieldsProps {
    register: UseFormRegister<TeacherInviteFormData>;
    errors: FieldErrors<TeacherInviteFormData>;
    userRoleValue: string;
    advisoryClassValue: string;
    onAdvisoryClassChange: (value: string) => void;
}

export interface AcademicFieldsProps {
    register: UseFormRegister<TeacherInviteFormData>;
    errors: FieldErrors<TeacherInviteFormData>;
    academicYears: AcademicYear[];
}

export interface FormActionsProps {
    isLoading: boolean;
    onCancel: () => void;
}
