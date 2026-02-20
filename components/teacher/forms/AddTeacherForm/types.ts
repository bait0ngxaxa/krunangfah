/**
 * Type definitions for AddTeacherForm
 */

import type {
    UseFormReturn,
    UseFormRegister,
    FieldErrors,
} from "react-hook-form";
import type { TeacherInviteFormData } from "@/lib/validations/teacher-invite.validation";
import type {
    SchoolClassItem,
    TeacherRosterItem,
} from "@/types/school-setup.types";

// Re-export for convenience
export type { TeacherInviteFormData };

export type { SchoolClassItem };

export type { TeacherRosterItem };

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
    selectedRosterId: string;
    onSelectRoster: (id: string, roster: TeacherRosterItem[]) => void;
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
    schoolClasses: SchoolClassItem[];
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
