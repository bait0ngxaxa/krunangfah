"use client";

import { useTeacherProfileForm } from "./useTeacherProfileForm";
import { DEFAULT_ADVISORY_CLASS } from "./constants";
import type { AcademicYear } from "./types";
import {
    ErrorMessage,
    NameFields,
    SchoolInfoFields,
    ProjectFields,
    SubmitButton,
} from "./components";

interface TeacherProfileFormProps {
    academicYears: AcademicYear[];
}

/**
 * TeacherProfileForm - Form for creating teacher profile (school_admin)
 * Refactored following separation of concerns and modular design
 */
export function TeacherProfileForm({
    academicYears,
}: TeacherProfileFormProps): React.ReactNode {
    const { form, isLoading, error, onSubmit } =
        useTeacherProfileForm(academicYears);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = form;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <ErrorMessage error={error} />

            <NameFields register={register} errors={errors} />

            <SchoolInfoFields register={register} errors={errors} />

            {/* Hidden field for advisoryClass - school_admin ไม่ต้องเลือกห้อง */}
            <input
                type="hidden"
                {...register("advisoryClass")}
                value={DEFAULT_ADVISORY_CLASS}
            />

            <ProjectFields
                register={register}
                errors={errors}
                academicYears={academicYears}
            />

            <SubmitButton isLoading={isLoading} />
        </form>
    );
}
