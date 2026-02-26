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
    initialHasSchool = false,
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
        setStep,
        setClasses,
        setRoster,
        handleFinish,
        handleSubmitForm,
    } = useSchoolSetupWizard({ initialHasSchool });

    return (
        <div className="w-full max-w-2xl mx-auto">
            <StepIndicator currentStep={step} />

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
                    onUpdate={setClasses}
                    onNext={() => setStep(2)}
                />
            )}

            {step === 2 && (
                <RosterStep
                    roster={roster}
                    classes={classes}
                    onUpdate={setRoster}
                    onBack={() => setStep(1)}
                    onNext={() => setStep(3)}
                />
            )}

            {step === 3 && (
                <SummaryStep
                    schoolName={schoolInfo?.name ?? ""}
                    province={schoolInfo?.province}
                    classes={classes}
                    roster={roster}
                    onBack={() => setStep(2)}
                    onFinish={handleFinish}
                />
            )}
        </div>
    );
}
