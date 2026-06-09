import { PROJECT_ROLES } from "../constants";
import type { ProjectFieldsProps } from "../types";

export function ProjectFields({
    register,
    errors,
}: ProjectFieldsProps): React.ReactNode {
    return (
        <>
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
                    id="projectRole"
                    aria-invalid={!!errors.projectRole}
                    aria-describedby={
                        errors.projectRole ? "projectRole-error" : undefined
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 focus:border-[var(--brand-primary)] transition-colors outline-none bg-white shadow-sm text-gray-900"
                >
                    <option value="">เลือกบทบาท</option>
                    {PROJECT_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                            {role.label}
                        </option>
                    ))}
                </select>
                {errors.projectRole && (
                    <p
                        id="projectRole-error"
                        className="mt-1 break-words text-sm font-medium text-red-500"
                    >
                        {errors.projectRole.message}
                    </p>
                )}
            </div>
        </>
    );
}
