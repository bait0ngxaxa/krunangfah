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
                    className="block text-sm font-bold text-gray-700 mb-2"
                >
                    ชื่อโรงเรียน <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("schoolName")}
                    type="text"
                    id="schoolName"
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 transition-all outline-none text-black placeholder:text-gray-500 hover:border-pink-300"
                    placeholder="กรอกชื่อโรงเรียน"
                />
                {errors.schoolName && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.schoolName.message}
                    </p>
                )}
            </div>

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
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 transition-all outline-none text-black placeholder:text-gray-500 hover:border-pink-300"
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
                    className="block text-sm font-bold text-gray-700 mb-2"
                >
                    บทบาทหน้าที่ในโรงเรียน{" "}
                    <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("schoolRole")}
                    type="text"
                    id="schoolRole"
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 transition-all outline-none text-black placeholder:text-gray-500 hover:border-pink-300"
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
