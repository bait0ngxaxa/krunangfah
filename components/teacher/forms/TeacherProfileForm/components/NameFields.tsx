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
                    className="block text-sm font-semibold text-gray-700 mb-2"
                >
                    ชื่อ <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("firstName")}
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 focus:border-[#0BD0D9] transition-colors outline-none bg-white shadow-sm text-gray-900 placeholder:text-gray-400"
                    placeholder="กรอกชื่อ"
                />
                {errors.firstName && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.firstName.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="lastName"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                >
                    สกุล <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("lastName")}
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 focus:border-[#0BD0D9] transition-colors outline-none bg-white shadow-sm text-gray-900 placeholder:text-gray-400"
                    placeholder="กรอกนามสกุล"
                />
                {errors.lastName && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.lastName.message}
                    </p>
                )}
            </div>
        </div>
    );
}
