"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSchoolAndLink } from "@/lib/actions/school-setup.actions";
import {
    completeOnboarding,
    saveOnboardingProgress,
} from "@/lib/actions/onboarding.actions";
import {
    getOnboardingStatusForStep,
} from "@/lib/onboarding/school-setup-resume";
import type {
    SchoolClassItem,
    TeacherRosterItem,
} from "@/types/school-setup.types";
import { schoolInfoSchema, type SchoolInfoData } from "./constants";
import type { StepIndex, UseSchoolSetupWizardReturn } from "./types";

interface UseSchoolSetupWizardParams {
    initialStep: StepIndex;
    initialClasses: SchoolClassItem[];
    initialRoster: TeacherRosterItem[];
    initialSchoolInfo: { name: string; province?: string } | null;
}

export function useSchoolSetupWizard({
    initialStep,
    initialClasses,
    initialRoster,
    initialSchoolInfo,
}: UseSchoolSetupWizardParams): UseSchoolSetupWizardReturn {
    const [step, setStep] = useState<StepIndex>(initialStep);
    const [classes, setClasses] = useState<SchoolClassItem[]>(initialClasses);
    const [roster, setRoster] = useState<TeacherRosterItem[]>(initialRoster);
    const [schoolInfo, setSchoolInfo] = useState(initialSchoolInfo);
    const [serverError, setServerError] = useState<string | null>(null);
    const [isProgressPending, setIsProgressPending] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SchoolInfoData>({
        resolver: zodResolver(schoolInfoSchema),
    });

    async function onSchoolInfoSubmit(data: SchoolInfoData): Promise<void> {
        setServerError(null);

        const result = await createSchoolAndLink(data);

        if (!result.success) {
            setServerError(result.message);
            return;
        }

        // Save school info for summary
        setSchoolInfo({ name: data.name, province: data.province });

        setStep(1);
    }

    async function goToStep(nextStep: StepIndex): Promise<void> {
        if (nextStep === step || isProgressPending) return;

        const nextStatus = getOnboardingStatusForStep(nextStep);
        if (!nextStatus) {
            setStep(nextStep);
            return;
        }

        setIsProgressPending(true);
        setServerError(null);

        try {
            const result = await saveOnboardingProgress({
                status: nextStatus,
            });

            if (!result.success) {
                setServerError(result.message);
                return;
            }

            setStep(nextStep);
        } finally {
            setIsProgressPending(false);
        }
    }

    async function handleFinish(): Promise<void> {
        if (!schoolInfo?.name) {
            setStep(0);
            setServerError("กรุณากรอกข้อมูลโรงเรียนให้ครบก่อนเสร็จสิ้น");
            return;
        }

        if (isProgressPending) return;

        setIsProgressPending(true);
        setServerError(null);

        try {
            const result = await completeOnboarding();
            if (!result.success) {
                setServerError(result.message);
                return;
            }

            window.location.href = "/dashboard";
        } finally {
            setIsProgressPending(false);
        }
    }

    return {
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
        onSchoolInfoSubmit,
        handleFinish,
        handleSubmitForm: handleSubmit(onSchoolInfoSubmit),
    };
}
