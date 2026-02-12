import { Check } from "lucide-react";
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
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    ประเภทครู <span className="text-red-500">*</span>
                </label>
                <select
                    {...register("userRole")}
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 outline-none bg-white transition-all hover:border-pink-300"
                >
                    <option value="">เลือกประเภทครู</option>
                    {USER_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                            {role.label}
                        </option>
                    ))}
                </select>
                {errors.userRole && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
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
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    บทบาทหน้าที่ในโครงการครูนางฟ้า{" "}
                    <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-4 bg-pink-50/50 p-4 rounded-xl border border-pink-100">
                    {PROJECT_ROLES.map((role) => (
                        <label
                            key={role.value}
                            className="flex items-center gap-2 cursor-pointer group"
                        >
                            <div className="relative flex items-center">
                                <input
                                    {...register("projectRole")}
                                    type="radio"
                                    value={role.value}
                                    className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-pink-300 shadow-sm transition-all checked:border-pink-500 checked:bg-pink-500 hover:border-pink-400"
                                />
                                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform text-white opacity-0 peer-checked:opacity-100">
                                    <Check className="h-2.5 w-2.5" />
                                </span>
                            </div>
                            <span className="text-gray-700 group-hover:text-pink-600 transition-colors font-medium">
                                {role.label}
                            </span>
                        </label>
                    ))}
                </div>
                {errors.projectRole && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.projectRole.message}
                    </p>
                )}
            </div>
        </>
    );
}
