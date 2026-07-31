"use client";

import { useSchoolSetupWizard } from "./useSchoolSetupWizard";
import {
    StepIndicator,
    SchoolInfoStep,
    ClassStep,
    RosterStep,
    SummaryStep,
} from "./components";
import type { SchoolSetupWizardProps } from "./types";

export function SchoolSetupWizard({
    initialStep = 0,
    initialClasses = [],
    initialRoster = [],
    initialSchoolInfo = null,
    currentAcademicYear,
}: SchoolSetupWizardProps) {
    const {
        step,
        classes,
        roster,
        schoolInfo,
        serverError,
        isSubmitting,
        register,
        errors,
        goToStep,
        setClasses,
        setRoster,
        handleFinish,
        handleSubmitForm,
    } = useSchoolSetupWizard({
        initialStep,
        initialClasses,
        initialRoster,
        initialSchoolInfo,
    });

    return (
        <div className="w-full max-w-2xl mx-auto">
            <StepIndicator currentStep={step} />

            {serverError && step !== 0 && (
                <p
                    role="alert"
                    className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
                >
                    {serverError}
                </p>
            )}

            {step === 0 && (
                <SchoolInfoStep
                    register={register}
                    errors={errors}
                    isSubmitting={isSubmitting}
                    serverError={serverError}
                    onSubmit={handleSubmitForm}
                />
            )}

            {step === 1 && (
                <ClassStep
                    classes={classes}
                    currentAcademicYear={currentAcademicYear}
                    onUpdate={setClasses}
                    onNext={() => goToStep(2)}
                />
            )}

            {step === 2 && (
                <RosterStep
                    roster={roster}
                    classes={classes}
                    onUpdate={setRoster}
                    onBack={() => goToStep(1)}
                    onNext={() => goToStep(3)}
                />
            )}

            {step === 3 && (
                <SummaryStep
                    schoolName={schoolInfo?.name ?? ""}
                    province={schoolInfo?.province}
                    classes={classes}
                    roster={roster}
                    canFinish={!!schoolInfo?.name}
                    onBack={() => goToStep(2)}
                    onFinish={handleFinish}
                />
            )}
        </div>
    );
}
