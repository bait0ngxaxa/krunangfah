"use client";

import { useProfileSettingsForm } from "./useProfileSettingsForm";
import {
    NameFields,
    SchoolInfoDisplay,
    EditableInfoFields,
    ProjectFields,
} from "./components";
import { SubmitButton } from "@/components/teacher/forms/TeacherProfileForm/components";
import type { AcademicYear } from "@/types/teacher.types";
import type { UserProfileData } from "@/types/profile.types";
import type { UserRole } from "@/types/auth.types";

interface ProfileSettingsFormProps {
    initialData: UserProfileData;
    academicYears: AcademicYear[];
    userRole: UserRole;
    hasStudents: boolean;
}

export function ProfileSettingsForm({
    initialData,
    academicYears,
    userRole,
    hasStudents,
}: ProfileSettingsFormProps) {
    const { form, isLoading, onSubmit } = useProfileSettingsForm(initialData);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = form;

    const isSchoolAdmin = userRole === "school_admin";
    const canEditAdvisoryClass = !hasStudents; // Can only edit if no students yet

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Section */}
            <NameFields register={register} errors={errors} />

            {/* School Info (Read-only) */}
            <SchoolInfoDisplay
                schoolName={initialData.school?.name || "ไม่พบข้อมูล"}
            />

            {/* Editable Info: Age, Advisory Class (hidden for school_admin), School Role */}
            <EditableInfoFields
                register={register}
                errors={errors}
                showAdvisoryClass={!isSchoolAdmin}
                canEditAdvisoryClass={canEditAdvisoryClass}
                currentAdvisoryClass={initialData.teacher.advisoryClass}
            />

            {/* Hidden advisoryClass field for school_admin */}
            {isSchoolAdmin && (
                <input
                    type="hidden"
                    {...register("advisoryClass")}
                    value={initialData.teacher.advisoryClass}
                />
            )}

            {/* Project Fields: Academic Year & Project Role */}
            <ProjectFields
                register={register}
                errors={errors}
                academicYears={academicYears}
            />

            {/* Submit Button */}
            <SubmitButton isLoading={isLoading} />
        </form>
    );
}
