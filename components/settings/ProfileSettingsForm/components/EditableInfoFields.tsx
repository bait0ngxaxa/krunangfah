import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type { ProfileUpdateFormData } from "@/lib/validations/profile.validation";

interface EditableInfoFieldsProps {
    register: UseFormRegister<ProfileUpdateFormData>;
    errors: FieldErrors<ProfileUpdateFormData>;
    showAdvisoryClass?: boolean;
    canEditAdvisoryClass?: boolean;
    currentAdvisoryClass?: string;
}

/**
 * Editable fields for profile settings: age, advisory class (optional), school role
 */
export function EditableInfoFields({
    register,
    errors,
    showAdvisoryClass = true,
    canEditAdvisoryClass = true,
    currentAdvisoryClass = "",
}: EditableInfoFieldsProps) {
    return (
        <>
            <div>
                <label
                    htmlFor="age"
                    className="block text-sm font-bold text-gray-700 mb-2"
                >
                    อายุ <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("age", { valueAsNumber: true })}
                    type="number"
                    id="age"
                    min="18"
                    max="100"
                    className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all outline-none text-black placeholder:text-gray-600 hover:border-emerald-300"
                    placeholder="กรอกอายุ"
                />
                {errors.age && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.age.message}
                    </p>
                )}
            </div>

            {showAdvisoryClass && (
                <div>
                    <label
                        htmlFor="advisoryClass"
                        className="block text-sm font-bold text-gray-700 mb-2"
                    >
                        ชั้นที่ปรึกษา <span className="text-red-500">*</span>
                    </label>
                    {canEditAdvisoryClass ? (
                        <input
                            {...register("advisoryClass")}
                            type="text"
                            id="advisoryClass"
                            className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all outline-none text-black placeholder:text-gray-600 hover:border-emerald-300"
                            placeholder="เช่น ม.1/1, ม.2/3"
                        />
                    ) : (
                        <>
                            <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium">
                                {currentAdvisoryClass}
                            </div>
                            <p className="mt-1 text-sm text-amber-600 flex items-center gap-1">
                                <span>⚠️</span>
                                <span>
                                    ไม่สามารถแก้ไขชั้นที่ปรึกษาได้
                                    เนื่องจากมีนักเรียนในระบบแล้ว
                                </span>
                            </p>
                        </>
                    )}
                    {errors.advisoryClass && (
                        <p className="mt-1 text-sm text-red-500 font-medium">
                            {errors.advisoryClass.message}
                        </p>
                    )}
                </div>
            )}

            <div>
                <label
                    htmlFor="schoolRole"
                    className="block text-sm font-bold text-gray-700 mb-2"
                >
                    บทบาทหน้าที่ในโรงเรียน{" "}
                    <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("schoolRole")}
                    type="text"
                    id="schoolRole"
                    className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all outline-none text-black placeholder:text-gray-600 hover:border-emerald-300"
                    placeholder="เช่น ครูประจำชั้น, หัวหน้ากลุ่มสาระ"
                />
                {errors.schoolRole && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.schoolRole.message}
                    </p>
                )}
            </div>
        </>
    );
}
