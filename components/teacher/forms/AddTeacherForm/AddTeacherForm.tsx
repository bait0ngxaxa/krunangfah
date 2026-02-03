"use client";

import { useAddTeacherForm } from "./useAddTeacherForm";
import {
    ErrorMessage,
    InviteLinkSection,
    PersonalInfoFields,
    RoleSelectionFields,
    AcademicFields,
    FormActions,
} from "./components";

/**
 * AddTeacherForm - Form for creating teacher invite
 * Refactored following separation of concerns and modular design
 */
export function AddTeacherForm(): React.ReactNode {
    const {
        form,
        isLoading,
        error,
        success,
        inviteLink,
        academicYears,
        userRoleValue,
        advisoryClassValue,
        onSubmit,
        copyToClipboard,
        handleCancel,
    } = useAddTeacherForm();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = form;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <ErrorMessage error={error} />

            <InviteLinkSection
                success={success}
                inviteLink={inviteLink}
                onCopy={copyToClipboard}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PersonalInfoFields register={register} errors={errors} />

                <RoleSelectionFields
                    register={register}
                    errors={errors}
                    userRoleValue={userRoleValue}
                    advisoryClassValue={advisoryClassValue}
                    onAdvisoryClassChange={(val) =>
                        setValue("advisoryClass", val, { shouldValidate: true })
                    }
                />

                <AcademicFields
                    register={register}
                    errors={errors}
                    academicYears={academicYears}
                />
            </div>

            <FormActions isLoading={isLoading} onCancel={handleCancel} />
        </form>
    );
}
