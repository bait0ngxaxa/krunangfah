import type {
    UseFormRegister,
    FieldErrors,
    UseFormHandleSubmit,
} from "react-hook-form";
import type { TeacherRosterFormData } from "@/lib/validations/teacher-roster.validation";
import type {
    TeacherRosterItem,
    SchoolClassItem,
} from "@/types/school-setup.types";

// Re-export for convenience
export type { TeacherRosterItem, SchoolClassItem, TeacherRosterFormData };

export interface TeacherRosterEditorProps {
    initialRoster: TeacherRosterItem[];
    schoolClasses: SchoolClassItem[];
    onUpdate?: (roster: TeacherRosterItem[]) => void;
    readOnly?: boolean;
}

export interface UseTeacherRosterReturn {
    roster: TeacherRosterItem[];
    errorMsg: string | null;
    showForm: boolean;
    editingId: string | null;
    isSubmitting: boolean;
    userRoleValue: string;
    advisoryClassValue: string;
    register: UseFormRegister<TeacherRosterFormData>;
    errors: FieldErrors<TeacherRosterFormData>;
    handleSubmit: UseFormHandleSubmit<TeacherRosterFormData>;
    setValue: (
        name: keyof TeacherRosterFormData,
        value: string | number,
        options?: { shouldValidate?: boolean },
    ) => void;
    openAddForm: () => void;
    startEdit: (teacher: TeacherRosterItem) => void;
    cancelForm: () => void;
    onSubmit: (data: TeacherRosterFormData) => Promise<void>;
    deleteTarget: { id: string; name: string } | null;
    isRemoving: boolean;
    requestRemove: (id: string, name: string) => void;
    confirmRemove: () => Promise<void>;
    cancelRemove: () => void;
}

export interface RosterFormProps {
    editingId: string | null;
    isSubmitting: boolean;
    userRoleValue: string;
    advisoryClassValue: string;
    schoolClasses: SchoolClassItem[];
    register: UseFormRegister<TeacherRosterFormData>;
    errors: FieldErrors<TeacherRosterFormData>;
    handleSubmit: UseFormHandleSubmit<TeacherRosterFormData>;
    setValue: (
        name: keyof TeacherRosterFormData,
        value: string | number,
        options?: { shouldValidate?: boolean },
    ) => void;
    onSubmit: (data: TeacherRosterFormData) => Promise<void>;
    onCancel: () => void;
}

export interface RosterListProps {
    roster: TeacherRosterItem[];
    editingId: string | null;
    readOnly: boolean;
    onEdit: (teacher: TeacherRosterItem) => void;
    onRemove: (id: string, name: string) => void;
}

export interface RosterItemProps {
    teacher: TeacherRosterItem;
    isEditing: boolean;
    readOnly: boolean;
    onEdit: (teacher: TeacherRosterItem) => void;
    onRemove: (id: string, name: string) => void;
}
