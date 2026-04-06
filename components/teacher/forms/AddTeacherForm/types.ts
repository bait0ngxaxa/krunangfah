/**
 * Type definitions for AddTeacherForm
 */

import type {
    UseFormReturn,
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
    isCurrent?: boolean;
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
