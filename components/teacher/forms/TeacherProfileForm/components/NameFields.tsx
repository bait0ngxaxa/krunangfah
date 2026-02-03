import type { NameFieldsProps } from "../types";

export function NameFields({
    register,
    errors,
}: NameFieldsProps): React.ReactNode {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    ชื่อ <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("firstName")}
                    type="text"
                    id="firstName"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="กรอกชื่อ"
                />
                {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.firstName.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    สกุล <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("lastName")}
                    type="text"
                    id="lastName"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="กรอกนามสกุล"
                />
                {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.lastName.message}
                    </p>
                )}
            </div>
        </div>
    );
}
