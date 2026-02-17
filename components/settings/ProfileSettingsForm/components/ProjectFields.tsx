import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type { ProfileUpdateFormData } from "@/lib/validations/profile.validation";
import type { AcademicYear } from "@/types/teacher.types";

interface ProjectFieldsProps {
    register: UseFormRegister<ProfileUpdateFormData>;
    errors: FieldErrors<ProfileUpdateFormData>;
    academicYears: AcademicYear[];
}

const PROJECT_ROLES = [
    { value: "lead", label: "ทีมนำ (Lead)" },
    { value: "care", label: "ทีมดูแล (Care)" },
    { value: "coordinate", label: "ทีมประสาน (Coordinate)" },
] as const;

/**
 * Project fields for profile settings: academic year & project role
 */
export function ProjectFields({
    register,
    errors,
    academicYears,
}: ProjectFieldsProps) {
    return (
        <>
            <div>
                <label
                    htmlFor="academicYearId"
                    className="block text-sm font-bold text-gray-700 mb-2"
                >
                    ปีการศึกษา/เทอม <span className="text-red-500">*</span>
                </label>
                <select
                    {...register("academicYearId")}
                    id="academicYearId"
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 transition-all outline-none bg-white hover:border-pink-300"
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
                    className="block text-sm font-bold text-gray-700 mb-2"
                >
                    บทบาทหน้าที่ในโครงการครูนางฟ้า{" "}
                    <span className="text-red-500">*</span>
                </label>
                <select
                    {...register("projectRole")}
                    id="projectRole"
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 transition-all outline-none bg-white hover:border-pink-300"
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
