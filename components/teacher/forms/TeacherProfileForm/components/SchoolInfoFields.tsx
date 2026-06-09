import type { SchoolInfoFieldsProps } from "../types";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";

export function SchoolInfoFields({
    register,
    errors,
}: SchoolInfoFieldsProps): React.ReactNode {
    return (
        <>
            <div>
                <label
                    htmlFor="age"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                >
                    อายุ <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("age", { valueAsNumber: true })}
                    type="number"
                    id="age"
                    min="18"
                    inputMode="numeric"
                    aria-invalid={!!errors.age}
                    aria-describedby={errors.age ? "age-error" : undefined}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 focus:border-[var(--brand-primary)] transition-colors outline-none bg-white shadow-sm text-gray-900 placeholder:text-gray-400"
                    placeholder="กรอกอายุ"
                />
                {errors.age && (
                    <p
                        id="age-error"
                        className="mt-1 break-words text-sm font-medium text-red-500"
                    >
                        {errors.age.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="schoolRole"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                >
                    บทบาทหน้าที่ในโรงเรียน{" "}
                    <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("schoolRole")}
                    id="schoolRole"
                    type="text"
                    maxLength={INPUT_LIMITS.teacher.schoolRole}
                    aria-invalid={!!errors.schoolRole}
                    aria-describedby={
                        errors.schoolRole ? "schoolRole-error" : undefined
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 focus:border-[var(--brand-primary)] transition-colors outline-none bg-white shadow-sm text-gray-900 placeholder:text-gray-400"
                    placeholder="เช่น ครูประจำชั้น, หัวหน้ากลุ่มสาระ"
                />
                {errors.schoolRole && (
                    <p
                        id="schoolRole-error"
                        className="mt-1 break-words text-sm font-medium text-red-500"
                    >
                        {errors.schoolRole.message}
                    </p>
                )}
            </div>
        </>
    );
}
