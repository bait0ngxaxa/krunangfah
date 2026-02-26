import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type {
    SchoolClassItem,
    TeacherRosterItem,
} from "@/types/school-setup.types";
import type { SchoolInfoData } from "./constants";

// Re-export for convenience
export type { SchoolClassItem, TeacherRosterItem, SchoolInfoData };

export type StepIndex = 0 | 1 | 2 | 3;

export interface SchoolSetupWizardProps {
    initialHasSchool?: boolean;
}

export interface UseSchoolSetupWizardReturn {
    step: StepIndex;
    classes: SchoolClassItem[];
    roster: TeacherRosterItem[];
    schoolInfo: { name: string; province?: string } | null;
    serverError: string | null;
    isSubmitting: boolean;
    register: UseFormRegister<SchoolInfoData>;
    errors: FieldErrors<SchoolInfoData>;
    setStep: (step: StepIndex) => void;
    setClasses: (classes: SchoolClassItem[]) => void;
    setRoster: (roster: TeacherRosterItem[]) => void;
    onSchoolInfoSubmit: (data: SchoolInfoData) => Promise<void>;
    handleFinish: () => void;
    handleSubmitForm: (
        e?: React.BaseSyntheticEvent,
    ) => Promise<void>;
}

export interface StepIndicatorProps {
    currentStep: StepIndex;
}

export interface SchoolInfoStepProps {
    register: UseFormRegister<SchoolInfoData>;
    errors: FieldErrors<SchoolInfoData>;
    isSubmitting: boolean;
    serverError: string | null;
    onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

export interface ClassStepProps {
    classes: SchoolClassItem[];
    onUpdate: (classes: SchoolClassItem[]) => void;
    onNext: () => void;
}

export interface RosterStepProps {
    roster: TeacherRosterItem[];
    classes: SchoolClassItem[];
    onUpdate: (roster: TeacherRosterItem[]) => void;
    onBack: () => void;
    onNext: () => void;
}

export interface SummaryStepProps {
    schoolName: string;
    province?: string;
    classes: SchoolClassItem[];
    roster: TeacherRosterItem[];
    onBack: () => void;
    onFinish: () => void;
}
