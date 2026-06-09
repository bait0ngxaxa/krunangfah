import type { NameFieldsProps } from "../types";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";

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
                    id="firstName"
                    type="text"
                    maxLength={INPUT_LIMITS.teacher.firstName}
                    aria-invalid={!!errors.firstName}
                    aria-describedby={
                        errors.firstName ? "firstName-error" : undefined
                    }
                    autoComplete="given-name"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 focus:border-[var(--brand-primary)] transition-colors outline-none bg-white shadow-sm text-gray-900 placeholder:text-gray-400"
                    placeholder="กรอกชื่อ"
                />
                {errors.firstName && (
                    <p
                        id="firstName-error"
                        className="mt-1 break-words text-sm font-medium text-red-500"
                    >
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
                    id="lastName"
                    type="text"
                    maxLength={INPUT_LIMITS.teacher.lastName}
                    aria-invalid={!!errors.lastName}
                    aria-describedby={
                        errors.lastName ? "lastName-error" : undefined
                    }
                    autoComplete="family-name"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 focus:border-[var(--brand-primary)] transition-colors outline-none bg-white shadow-sm text-gray-900 placeholder:text-gray-400"
                    placeholder="กรอกนามสกุล"
                />
                {errors.lastName && (
                    <p
                        id="lastName-error"
                        className="mt-1 break-words text-sm font-medium text-red-500"
                    >
                        {errors.lastName.message}
                    </p>
                )}
            </div>
        </div>
    );
}
