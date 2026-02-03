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
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    ปีการศึกษา/เทอม <span className="text-red-500">*</span>
                </label>
                <select
                    {...register("academicYearId")}
                    id="academicYearId"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    <p className="mt-1 text-sm text-red-600">
                        {errors.academicYearId.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="projectRole"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    บทบาทหน้าที่ในโครงการครูนางฟ้า{" "}
                    <span className="text-red-500">*</span>
                </label>
                <select
                    {...register("projectRole")}
                    id="projectRole"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                    <option value="">เลือกบทบาท</option>
                    {PROJECT_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                            {role.label}
                        </option>
                    ))}
                </select>
                {errors.projectRole && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.projectRole.message}
                    </p>
                )}
            </div>
        </>
    );
}
