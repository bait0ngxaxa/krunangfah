import { ClassSelector } from "@/components/ui/ClassSelector";
import { PROJECT_ROLES, USER_ROLES } from "../constants";
import type { RoleSelectionFieldsProps } from "../types";

export function RoleSelectionFields({
    register,
    errors,
    userRoleValue,
    advisoryClassValue,
    onAdvisoryClassChange,
}: RoleSelectionFieldsProps): React.ReactNode {
    return (
        <>
            {/* User Role */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภทครู
                </label>
                <select
                    {...register("userRole")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">เลือกประเภทครู</option>
                    {USER_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                            {role.label}
                        </option>
                    ))}
                </select>
                {errors.userRole && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.userRole.message}
                    </p>
                )}
            </div>

            {/* Advisory Class - Only show for class_teacher */}
            {userRoleValue === "class_teacher" && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        ชั้นที่ปรึกษา
                    </label>
                    <ClassSelector
                        value={advisoryClassValue}
                        onChange={onAdvisoryClassChange}
                        error={errors.advisoryClass?.message}
                    />
                </div>
            )}

            {/* Hidden field for school_admin */}
            {userRoleValue === "school_admin" && (
                <input
                    type="hidden"
                    {...register("advisoryClass")}
                    value="ทุกห้อง"
                />
            )}

            {/* Project Role */}
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    บทบาทหน้าที่ในโครงการครูนางฟ้า
                </label>
                <div className="flex gap-4">
                    {PROJECT_ROLES.map((role) => (
                        <label
                            key={role.value}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <input
                                {...register("projectRole")}
                                type="radio"
                                value={role.value}
                                className="w-4 h-4 text-blue-600"
                            />
                            <span>{role.label}</span>
                        </label>
                    ))}
                </div>
                {errors.projectRole && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.projectRole.message}
                    </p>
                )}
            </div>
        </>
    );
}
