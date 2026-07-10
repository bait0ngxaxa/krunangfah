"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { updateMyTeacherGeneralInfo } from "@/lib/actions/teacher-general-info.actions";
import { PROJECT_ROLE_OPTIONS } from "@/lib/constants/roles";
import {
    teacherGeneralInfoSchema,
    type TeacherGeneralInfoData,
} from "@/lib/validations/teacher.validation";
import type { TeacherGeneralInfo } from "@/types/teacher.types";

interface TeacherGeneralInfoFormProps {
    teacher: TeacherGeneralInfo;
}

const INPUT_CLASS_NAME =
    "w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-colors placeholder:text-gray-500 hover:border-gray-300 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 disabled:cursor-not-allowed disabled:bg-gray-50";

export function TeacherGeneralInfoForm({
    teacher,
}: TeacherGeneralInfoFormProps): React.ReactNode {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty, isSubmitting },
    } = useForm<TeacherGeneralInfoData>({
        resolver: zodResolver(teacherGeneralInfoSchema),
        defaultValues: teacher,
    });

    async function onSubmit(data: TeacherGeneralInfoData): Promise<void> {
        const result = await updateMyTeacherGeneralInfo(data);
        if (!result.success || !result.data) {
            toast.error(result.message);
            return;
        }

        reset(result.data);
        toast.success(result.message);
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextField
                    id="teacher-first-name"
                    label="ชื่อ"
                    autoComplete="given-name"
                    error={errors.firstName?.message}
                    disabled={isSubmitting}
                    registration={register("firstName")}
                />
                <TextField
                    id="teacher-last-name"
                    label="นามสกุล"
                    autoComplete="family-name"
                    error={errors.lastName?.message}
                    disabled={isSubmitting}
                    registration={register("lastName")}
                />
            </div>

            <TextField
                id="teacher-age"
                label="อายุ"
                type="number"
                min={18}
                inputMode="numeric"
                error={errors.age?.message}
                disabled={isSubmitting}
                registration={register("age", { valueAsNumber: true })}
            />

            <TextField
                id="teacher-school-role"
                label="บทบาทหน้าที่ในโรงเรียน"
                placeholder="เช่น ครูประจำชั้น, หัวหน้ากลุ่มสาระ"
                error={errors.schoolRole?.message}
                disabled={isSubmitting}
                registration={register("schoolRole")}
            />

            <div>
                <label
                    htmlFor="teacher-project-role"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                >
                    บทบาทหน้าที่ในโครงการครูนางฟ้า <span className="text-red-600">*</span>
                </label>
                <select
                    id="teacher-project-role"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.projectRole}
                    aria-describedby={
                        errors.projectRole ? "teacher-project-role-error" : undefined
                    }
                    className={INPUT_CLASS_NAME}
                    {...register("projectRole")}
                >
                    {PROJECT_ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                            {role.label}
                        </option>
                    ))}
                </select>
                {errors.projectRole && (
                    <p id="teacher-project-role-error" className="mt-1.5 text-sm text-red-700">
                        {errors.projectRole.message}
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
                {isSubmitting ? "กำลังบันทึก…" : "บันทึกข้อมูลทั่วไป"}
            </Button>
        </form>
    );
}

interface TextFieldProps {
    id: string;
    label: string;
    registration: UseFormRegisterReturn;
    error?: string;
    disabled: boolean;
    type?: "number" | "text";
    min?: number;
    inputMode?: "numeric";
    autoComplete?: string;
    placeholder?: string;
}

function TextField({
    id,
    label,
    registration,
    error,
    disabled,
    type = "text",
    min,
    inputMode,
    autoComplete,
    placeholder,
}: TextFieldProps): React.ReactNode {
    const errorId = `${id}-error`;

    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-sm font-semibold text-gray-800">
                {label} <span className="text-red-600">*</span>
            </label>
            <input
                id={id}
                type={type}
                min={min}
                inputMode={inputMode}
                autoComplete={autoComplete}
                placeholder={placeholder}
                disabled={disabled}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                className={INPUT_CLASS_NAME}
                {...registration}
            />
            {error && (
                <p id={errorId} className="mt-1.5 text-sm text-red-700">
                    {error}
                </p>
            )}
        </div>
    );
}
