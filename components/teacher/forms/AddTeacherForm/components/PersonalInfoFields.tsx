import type { PersonalInfoFieldsProps } from "../types";

export function PersonalInfoFields({
    register,
    errors,
}: PersonalInfoFieldsProps): React.ReactNode {
    return (
        <>
            {/* Email */}
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    อีเมล
                </label>
                <input
                    {...register("email")}
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                    placeholder="example@email.com"
                />
                {errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.email.message}
                    </p>
                )}
            </div>

            {/* First Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อ
                </label>
                <input
                    {...register("firstName")}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                    placeholder="กรอกชื่อ"
                />
                {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.firstName.message}
                    </p>
                )}
            </div>

            {/* Last Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    สกุล
                </label>
                <input
                    {...register("lastName")}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                    placeholder="กรอกสกุล"
                />
                {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.lastName.message}
                    </p>
                )}
            </div>

            {/* Age */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    อายุ
                </label>
                <input
                    {...register("age")}
                    type="number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                    placeholder="อายุ"
                />
                {errors.age && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.age.message}
                    </p>
                )}
            </div>
        </>
    );
}
