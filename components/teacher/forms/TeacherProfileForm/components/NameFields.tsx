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
                    className="block text-sm font-bold text-gray-700 mb-2"
                >
                    ชื่อ <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("firstName")}
                    type="text"
                    id="firstName"
                    className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all outline-none text-black placeholder:text-gray-600 hover:border-emerald-300"
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
                    className="block text-sm font-bold text-gray-700 mb-2"
                >
                    สกุล <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("lastName")}
                    type="text"
                    id="lastName"
                    className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all outline-none text-black placeholder:text-gray-600 hover:border-emerald-300"
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
