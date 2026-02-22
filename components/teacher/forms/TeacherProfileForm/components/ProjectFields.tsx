import { PROJECT_ROLES } from "../constants";
import type { ProjectFieldsProps } from "../types";

export function ProjectFields({
    register,
    errors,
    academicYears,
}: ProjectFieldsProps): React.ReactNode {
    return (
        <>
            <div>
                <label
                    htmlFor="academicYearId"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                >
                    ปีการศึกษา/เทอม <span className="text-red-500">*</span>
                </label>
                <select
                    {...register("academicYearId")}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 focus:border-[#0BD0D9] transition-colors outline-none bg-white shadow-sm text-gray-900"
                >
                    <option value="">เลือกปีการศึกษา/เทอม</option>
                    {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                            {year.year}/{year.semester}{" "}
                            {year.isCurrent && "(ปัจจุบัน)"}
                        </option>
                    ))}
                </select>
                {errors.academicYearId && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.academicYearId.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="projectRole"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                >
                    บทบาทหน้าที่ในโครงการครูนางฟ้า{" "}
                    <span className="text-red-500">*</span>
                </label>
                <select
                    {...register("projectRole")}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 focus:border-[#0BD0D9] transition-colors outline-none bg-white shadow-sm text-gray-900"
                >
                    <option value="">เลือกบทบาท</option>
                    {PROJECT_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                            {role.label}
                        </option>
                    ))}
                </select>
                {errors.projectRole && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.projectRole.message}
                    </p>
                )}
            </div>
        </>
    );
}
