import type { PersonalInfoFieldsProps } from "../types";

export function PersonalInfoFields({
    register,
    errors,
}: PersonalInfoFieldsProps): React.ReactNode {
    return (
        <>
            {/* Email */}
            <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    อีเมล <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("email")}
                    type="email"
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 outline-none transition-all text-black placeholder:text-gray-500 hover:border-pink-300"
                    placeholder="example@email.com"
                />
                {errors.email && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.email.message}
                    </p>
                )}
            </div>

            {/* First Name */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    ชื่อ <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("firstName")}
                    type="text"
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 outline-none transition-all text-black placeholder:text-gray-500 hover:border-pink-300"
                    placeholder="ระบุชื่อ"
                />
                {errors.firstName && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.firstName.message}
                    </p>
                )}
            </div>

            {/* Last Name */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("lastName")}
                    type="text"
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 outline-none transition-all text-black placeholder:text-gray-500 hover:border-pink-300"
                    placeholder="ระบุนามสกุล"
                />
                {errors.lastName && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.lastName.message}
                    </p>
                )}
            </div>

            {/* Age */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    อายุ
                </label>
                <input
                    {...register("age")}
                    type="number"
                    className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 outline-none transition-all text-black placeholder:text-gray-500 hover:border-pink-300"
                    placeholder="ระบุอายุ"
                />
                {errors.age && (
                    <p className="mt-1 text-sm text-red-500 font-medium">
                        {errors.age.message}
                    </p>
                )}
            </div>
        </>
    );
}
