"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { updateMySchoolInfo } from "@/lib/actions/school-info.actions";
import {
    schoolInfoSchema,
    type SchoolInfoData,
} from "@/lib/validations/school.validation";
import type { SchoolInfo } from "@/types/school-info.types";

interface SchoolGeneralInfoFormProps {
    school: SchoolInfo;
}

const INPUT_CLASS_NAME =
    "w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-colors placeholder:text-gray-500 hover:border-gray-300 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 disabled:cursor-not-allowed disabled:bg-gray-50";

export function SchoolGeneralInfoForm({
    school,
}: SchoolGeneralInfoFormProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<SchoolInfoData>({
        resolver: zodResolver(schoolInfoSchema),
        defaultValues: {
            name: school.name,
            province: school.province ?? "",
        },
    });

    async function onSubmit(data: SchoolInfoData): Promise<void> {
        const result = await updateMySchoolInfo(data);
        if (!result.success || !result.data) {
            toast.error(result.message);
            return;
        }

        reset({
            name: result.data.name,
            province: result.data.province ?? "",
        });
        toast.success(result.message);
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
                <label
                    htmlFor="school-name"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                >
                    ชื่อโรงเรียน <span className="text-red-600">*</span>
                </label>
                <input
                    id="school-name"
                    type="text"
                    autoComplete="organization"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "school-name-error" : undefined}
                    className={INPUT_CLASS_NAME}
                    {...register("name")}
                />
                {errors.name && (
                    <p id="school-name-error" className="mt-1.5 text-sm text-red-700">
                        {errors.name.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="school-province"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                >
                    จังหวัด
                </label>
                <input
                    id="school-province"
                    type="text"
                    autoComplete="address-level1"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.province}
                    aria-describedby={
                        errors.province ? "school-province-error" : undefined
                    }
                    className={INPUT_CLASS_NAME}
                    placeholder="เช่น เชียงใหม่"
                    {...register("province")}
                />
                {errors.province && (
                    <p
                        id="school-province-error"
                        className="mt-1.5 text-sm text-red-700"
                    >
                        {errors.province.message}
                    </p>
                )}
            </div>

            <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting || !isDirty}
                className="w-full sm:w-auto"
            >
                <Save className="h-4 w-4" aria-hidden="true" />
                {isSubmitting ? "กำลังบันทึก…" : "บันทึกข้อมูลโรงเรียน"}
            </Button>
        </form>
    );
}
