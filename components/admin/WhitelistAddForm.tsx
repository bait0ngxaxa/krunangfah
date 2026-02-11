"use client";

import type { UseFormReturn } from "react-hook-form";
import type { WhitelistFormData } from "@/lib/validations/whitelist.validation";

interface WhitelistAddFormProps {
    form: UseFormReturn<WhitelistFormData>;
    isSubmitting: boolean;
    onSubmit: (data: WhitelistFormData) => Promise<void>;
}

export function WhitelistAddForm({
    form,
    isSubmitting,
    onSubmit,
}: WhitelistAddFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = form;

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-100/50 p-6 md:p-8 border border-pink-100">
            <div className="h-1.5 bg-linear-to-r from-rose-300 to-pink-300 rounded-full -mt-6 md:-mt-8 mx--6 md:mx--8 mb-6 rounded-t-3xl rounded-b-none" />
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">➕</span>
                <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                    เพิ่มอีเมล System Admin
                </span>
            </h2>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col sm:flex-row gap-3"
            >
                <div className="flex-1">
                    <input
                        {...register("email")}
                        type="email"
                        placeholder="example@email.com"
                        className="w-full px-4 py-3 border border-pink-100 rounded-xl focus:ring-4 focus:ring-pink-100/50 focus:border-pink-300 bg-white/50 backdrop-blur-sm transition-all outline-none text-black placeholder:text-gray-400"
                        disabled={isSubmitting}
                    />
                    {errors.email && (
                        <p className="mt-1 text-sm text-red-500 font-medium">
                            {errors.email.message}
                        </p>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-linear-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white rounded-xl font-bold transition-all duration-300 shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                >
                    {isSubmitting ? "กำลังเพิ่ม..." : "เพิ่มอีเมล"}
                </button>
            </form>
        </div>
    );
}
