import type { SchoolInfoFieldsProps } from "../types";

export function SchoolInfoFields({
    register,
    errors,
}: SchoolInfoFieldsProps): React.ReactNode {
    return (
        <>
            <div>
                <label
                    htmlFor="schoolName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    ชื่อโรงเรียน <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("schoolName")}
                    type="text"
                    id="schoolName"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="กรอกชื่อโรงเรียน"
                />
                {errors.schoolName && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.schoolName.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="age"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    อายุ <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("age", { valueAsNumber: true })}
                    type="number"
                    id="age"
                    min="18"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="กรอกอายุ"
                />
                {errors.age && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.age.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="schoolRole"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    บทบาทหน้าที่ในโรงเรียน <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("schoolRole")}
                    type="text"
                    id="schoolRole"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="เช่น ครูประจำชั้น, หัวหน้ากลุ่มสาระ"
                />
                {errors.schoolRole && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.schoolRole.message}
                    </p>
                )}
            </div>
        </>
    );
}
