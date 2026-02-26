"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { createSchoolAndLink } from "@/lib/actions/school-setup.actions";
import type {
    SchoolClassItem,
    TeacherRosterItem,
} from "@/types/school-setup.types";
import { schoolInfoSchema, type SchoolInfoData } from "./constants";
import type { StepIndex, UseSchoolSetupWizardReturn } from "./types";

interface UseSchoolSetupWizardParams {
    initialHasSchool: boolean;
}

export function useSchoolSetupWizard({
    initialHasSchool,
}: UseSchoolSetupWizardParams): UseSchoolSetupWizardReturn {
    const { update: updateSession } = useSession();
    const [step, setStep] = useState<StepIndex>(0);
    const [classes, setClasses] = useState<SchoolClassItem[]>([]);
    const [roster, setRoster] = useState<TeacherRosterItem[]>([]);
    const [schoolInfo, setSchoolInfo] = useState<{
        name: string;
        province?: string;
    } | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);

    // Flag ป้องกัน server action revalidation redirect
    // ตั้ง true ก่อนเรียก server action → เมื่อ page re-render
    // (initialHasSchool เปลี่ยนเป็น true) จะไม่ redirect ทิ้งกลางทาง wizard
    const [wizardActive, setWizardActive] = useState(false);

    // ถ้ามีโรงเรียนแล้วและยังไม่เริ่ม wizard → redirect ไป dashboard
    // (กรณี user พิมพ์ URL ตรงมาหลัง setup เสร็จ)
    useEffect(() => {
        if (initialHasSchool && !wizardActive) {
            window.location.href = "/dashboard";
        }
    }, [initialHasSchool, wizardActive]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SchoolInfoData>({
        resolver: zodResolver(schoolInfoSchema),
    });

    async function onSchoolInfoSubmit(data: SchoolInfoData): Promise<void> {
        setServerError(null);

        // ต้องตั้ง flag ก่อนเรียก server action
        // เพราะ server action จะ trigger page revalidation
        // ซึ่งจะทำให้ initialHasSchool เปลี่ยนเป็น true
        // React 18+ batch state updates → commit ก่อน async yield
        setWizardActive(true);

        const result = await createSchoolAndLink(data);

        if (!result.success) {
            setWizardActive(false);
            setServerError(result.message);
            return;
        }

        // Save school info for summary
        setSchoolInfo({ name: data.name, province: data.province });

        // Refresh session so schoolId is up-to-date in token
        await updateSession();
        setStep(1);
    }

    function handleFinish(): void {
        // Hard redirect — layout เช็ค schoolId จาก DB โดยตรง ไม่พึ่ง JWT
        window.location.href = "/dashboard";
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
        setStep,
        setClasses,
        setRoster,
        onSchoolInfoSubmit,
        handleFinish,
        handleSubmitForm: handleSubmit(onSchoolInfoSubmit),
    };
}
