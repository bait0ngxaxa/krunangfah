"use client";

import { Building2, ArrowRight } from "lucide-react";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";
import type { SchoolInfoStepProps } from "../types";

export function SchoolInfoStep({
    register,
    errors,
    isSubmitting,
    serverError,
    onSubmit,
}: SchoolInfoStepProps) {
    return (
        <div className="relative overflow-hidden rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="relative z-10 mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--brand-primary)] bg-white shadow-md">
                    <Building2 className="h-5 w-5 text-[var(--brand-primary)] stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                    <h2 className="break-words text-lg font-bold text-gray-800">
                        ข้อมูลโรงเรียน
                    </h2>
                    <p className="break-words text-sm text-gray-500">
                        กรอกชื่อและที่ตั้งโรงเรียน
                    </p>
                </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div>
                    <label
                        htmlFor="school-name"
                        className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                        ชื่อโรงเรียน{" "}
                        <span className="text-red-500">*</span>
                    </label>
                    <input
                        {...register("name")}
                        id="school-name"
                        type="text"
                        maxLength={INPUT_LIMITS.school.name}
                        placeholder="เช่น โรงเรียนสาธิตมหาวิทยาลัย"
                        aria-invalid={!!errors.name}
                        aria-describedby={
                            errors.name ? "school-name-error" : undefined
                        }
                        autoComplete="organization"
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 outline-none transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-[var(--brand-primary)]"
                        disabled={isSubmitting}
                    />
                    {errors.name && (
                        <p
                            id="school-name-error"
                            className="mt-1 break-words text-sm font-medium text-red-500"
                        >
                            {errors.name.message}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="school-province"
                        className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                        จังหวัด{" "}
                        <span className="text-gray-400 font-normal">
                            (ไม่บังคับ)
                        </span>
                    </label>
                    <input
                        {...register("province")}
                        id="school-province"
                        type="text"
                        maxLength={INPUT_LIMITS.school.province}
                        placeholder="เช่น กรุงเทพมหานคร"
                        aria-invalid={!!errors.province}
                        aria-describedby={
                            errors.province ? "school-province-error" : undefined
                        }
                        autoComplete="address-level1"
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 outline-none transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-[var(--brand-primary)]"
                        disabled={isSubmitting}
                    />
                    {errors.province && (
                        <p
                            id="school-province-error"
                            className="mt-1 break-words text-sm font-medium text-red-500"
                        >
                            {errors.province.message}
                        </p>
                    )}
                </div>

                {serverError && (
                    <p
                        role="alert"
                        className="break-words rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
                    >
                        {serverError}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-3 font-bold text-white shadow-sm transition-colors hover:bg-[var(--brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <span className="min-w-0 break-words">
                        {isSubmitting ? "กำลังบันทึก…" : "ถัดไป"}
                    </span>
                    {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                </button>
            </form>
        </div>
    );
}
