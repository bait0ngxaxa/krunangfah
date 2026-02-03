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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    ปีการศึกษา
                </label>
                <select
                    {...register("academicYearId")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">เลือกปีการศึกษา</option>
                    {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                            {year.year}/{year.semester}
                        </option>
                    ))}
                </select>
                {errors.academicYearId && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.academicYearId.message}
                    </p>
                )}
            </div>

            {/* School Role */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    บทบาทหน้าที่ในโรงเรียน
                </label>
                <input
                    {...register("schoolRole")}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="เช่น ครูประจำชั้น"
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
