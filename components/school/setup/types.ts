import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type {
    SchoolClassItem,
    TeacherRosterItem,
} from "@/types/school-setup.types";
import type { AcademicYearOption } from "@/components/school/classes";
import type { SchoolInfoData } from "./constants";
import type {
    SchoolSetupStep,
} from "@/types/onboarding.types";

// Re-export for convenience
export type { SchoolClassItem, TeacherRosterItem, SchoolInfoData };

export type StepIndex = SchoolSetupStep;

export interface SchoolSetupWizardProps {
    initialStep?: StepIndex;
    initialClasses?: SchoolClassItem[];
    initialRoster?: TeacherRosterItem[];
    initialSchoolInfo?: { name: string; province?: string } | null;
    currentAcademicYear: AcademicYearOption | null;
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
    goToStep: (step: StepIndex) => Promise<void>;
    setClasses: (classes: SchoolClassItem[]) => void;
    setRoster: (roster: TeacherRosterItem[]) => void;
    onSchoolInfoSubmit: (data: SchoolInfoData) => Promise<void>;
    handleFinish: () => Promise<void>;
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
    currentAcademicYear: AcademicYearOption | null;
    onUpdate: (classes: SchoolClassItem[]) => void;
    onNext: () => Promise<void>;
}

export interface RosterStepProps {
    roster: TeacherRosterItem[];
    classes: SchoolClassItem[];
    onUpdate: (roster: TeacherRosterItem[]) => void;
    onBack: () => Promise<void>;
    onNext: () => Promise<void>;
}

export interface SummaryStepProps {
    schoolName: string;
    province?: string;
    classes: SchoolClassItem[];
    roster: TeacherRosterItem[];
    canFinish: boolean;
    onBack: () => Promise<void>;
    onFinish: () => Promise<void>;
}
