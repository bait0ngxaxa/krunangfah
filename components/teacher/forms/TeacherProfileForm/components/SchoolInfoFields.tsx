import type { SchoolInfoFieldsProps } from "../types";

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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 focus:border-[#0BD0D9] transition-colors outline-none bg-white shadow-sm text-gray-900 placeholder:text-gray-400"
                    placeholder="กรอกอายุ"
                />
                {errors.age && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
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
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 focus:border-[#0BD0D9] transition-colors outline-none bg-white shadow-sm text-gray-900 placeholder:text-gray-400"
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
