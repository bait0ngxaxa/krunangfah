import type { AcademicFieldsProps } from "../types";

export function AcademicFields({
    register,
    errors,
    academicYears,
}: AcademicFieldsProps): React.ReactNode {
    return (
        <>
            {/* Academic Year */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    ปีการศึกษา <span className="text-red-500">*</span>
                </label>
                <select
                    {...register("academicYearId")}
                    className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none bg-white transition-all hover:border-emerald-300"
                >
                    <option value="">เลือกปีการศึกษา</option>
                    {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                            {year.year}/{year.semester}
                            {year.isCurrent ? " (ปัจจุบัน)" : ""}
                        </option>
                    ))}
                </select>
                {errors.academicYearId && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.academicYearId.message}
                    </p>
                )}
            </div>

            {/* School Role */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    บทบาทหน้าที่ในโรงเรียน{" "}
                    <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("schoolRole")}
                    type="text"
                    className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all placeholder:text-gray-400 hover:border-emerald-300"
                    placeholder="เช่น ครูประจำชั้น"
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
