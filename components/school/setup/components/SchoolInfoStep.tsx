"use client";

import { Building2, ArrowRight } from "lucide-react";
import type { SchoolInfoStepProps } from "../types";

export function SchoolInfoStep({
    register,
    errors,
    isSubmitting,
    serverError,
    onSubmit,
}: SchoolInfoStepProps) {
    return (
        <div className="relative bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6 sm:p-8 overflow-hidden">
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-[#0BD0D9] flex items-center justify-center shadow-md">
                    <Building2 className="w-5 h-5 text-white stroke-[2.5]" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-800">
                        ข้อมูลโรงเรียน
                    </h2>
                    <p className="text-sm text-gray-500">
                        กรอกชื่อและที่ตั้งโรงเรียน
                    </p>
                </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ชื่อโรงเรียน{" "}
                        <span className="text-red-500">*</span>
                    </label>
                    <input
                        {...register("name")}
                        type="text"
                        placeholder="เช่น โรงเรียนสาธิตมหาวิทยาลัย"
                        className="w-full px-4 py-3 border-2 border-gray-200 hover:border-gray-300 focus:border-[#0BD0D9] rounded-xl outline-none text-gray-900 placeholder:text-gray-400 transition-colors"
                        disabled={isSubmitting}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-500 font-medium">
                            {errors.name.message}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        จังหวัด{" "}
                        <span className="text-gray-400 font-normal">
                            (ไม่บังคับ)
                        </span>
                    </label>
                    <input
                        {...register("province")}
                        type="text"
                        placeholder="เช่น กรุงเทพมหานคร"
                        className="w-full px-4 py-3 border-2 border-gray-200 hover:border-gray-300 focus:border-[#0BD0D9] rounded-xl outline-none text-gray-900 placeholder:text-gray-400 transition-colors"
                        disabled={isSubmitting}
                    />
                </div>

                {serverError && (
                    <p className="text-sm text-red-500 font-medium">
                        {serverError}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#0BD0D9] hover:bg-[#09B8C0] text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {isSubmitting ? "กำลังบันทึก..." : "ถัดไป"}
                    {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                </button>
            </form>
        </div>
    );
}
