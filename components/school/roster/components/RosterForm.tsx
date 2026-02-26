"use client";

import { Plus, X, UserPlus, Check, Pencil } from "lucide-react";
import {
    USER_ROLE_OPTIONS,
    PROJECT_ROLE_OPTIONS,
} from "@/lib/constants/roles";
import type { RosterFormProps } from "../types";

export function RosterForm({
    editingId,
    isSubmitting,
    userRoleValue,
    advisoryClassValue,
    schoolClasses,
    register,
    errors,
    handleSubmit,
    setValue,
    onSubmit,
    onCancel,
}: RosterFormProps) {
    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-5 bg-white rounded-2xl border-2 border-[#0BD0D9]/50 shadow-sm space-y-4"
        >
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-[#09B8C0] flex items-center gap-1.5">
                    {editingId ? (
                        <>
                            <Pencil className="w-4 h-4" />
                            แก้ไขข้อมูลครู
                        </>
                    ) : (
                        <>
                            <UserPlus className="w-4 h-4" />
                            เพิ่มครู
                        </>
                    )}
                </span>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Row 1: Name + Age */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-3">
                <div className="col-span-1 sm:col-span-2">
                    <input
                        {...register("firstName")}
                        placeholder="ชื่อ *"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                    {errors.firstName && (
                        <p className="mt-0.5 text-xs text-red-500">
                            {errors.firstName.message}
                        </p>
                    )}
                </div>
                <div className="col-span-1 sm:col-span-2">
                    <input
                        {...register("lastName")}
                        placeholder="นามสกุล *"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                    {errors.lastName && (
                        <p className="mt-0.5 text-xs text-red-500">
                            {errors.lastName.message}
                        </p>
                    )}
                </div>
                <div className="col-span-1 sm:col-span-1">
                    <input
                        {...register("age", { valueAsNumber: true })}
                        type="number"
                        placeholder="อายุ *"
                        min={18}
                        max={100}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                    {errors.age && (
                        <p className="mt-0.5 text-xs text-red-500">
                            {errors.age.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Row 2: Email + User Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                    <input
                        {...register("email")}
                        type="email"
                        placeholder="อีเมล (ไม่บังคับ)"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                    {errors.email && (
                        <p className="mt-0.5 text-xs text-red-500">
                            {errors.email.message}
                        </p>
                    )}
                </div>
                <div>
                    <select
                        {...register("userRole")}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 transition-colors truncate"
                    >
                        <option value="">ประเภทครู *</option>
                        {USER_ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                    {errors.userRole && (
                        <p className="mt-0.5 text-xs text-red-500">
                            {errors.userRole.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Row 3: Advisory Class (only for class_teacher) + School Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {userRoleValue === "class_teacher" ? (
                    <div>
                        <select
                            value={advisoryClassValue}
                            onChange={(e) =>
                                setValue("advisoryClass", e.target.value, {
                                    shouldValidate: true,
                                })
                            }
                            className="w-full px-4 py-2 border border-violet-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-violet-100/50 focus:border-violet-300 bg-white shadow-sm text-black transition-all truncate"
                        >
                            <option value="">เลือกห้องที่ปรึกษา *</option>
                            {schoolClasses.map((c) => (
                                <option key={c.id} value={c.name}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        {errors.advisoryClass && (
                            <p className="mt-0.5 text-xs text-red-500">
                                {errors.advisoryClass.message}
                            </p>
                        )}
                    </div>
                ) : (
                    <div>
                        <input
                            {...register("schoolRole")}
                            placeholder="บทบาทในโรงเรียน *"
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-[#0BD0D9] bg-white text-gray-900 placeholder:text-gray-400"
                        />
                        {errors.schoolRole && (
                            <p className="mt-0.5 text-xs text-red-500">
                                {errors.schoolRole.message}
                            </p>
                        )}
                    </div>
                )}
                {userRoleValue === "class_teacher" ? (
                    <div>
                        <input
                            {...register("schoolRole")}
                            placeholder="บทบาทในโรงเรียน *"
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-[#0BD0D9] bg-white text-gray-900 placeholder:text-gray-400"
                        />
                        {errors.schoolRole && (
                            <p className="mt-0.5 text-xs text-red-500">
                                {errors.schoolRole.message}
                            </p>
                        )}
                    </div>
                ) : (
                    <div /> /* spacer for school_admin */
                )}
            </div>

            {/* Row 4: Project Role (radio buttons) */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    บทบาทในโครงการครูนางฟ้า{" "}
                    <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3 bg-white p-3 rounded-xl border-2 border-gray-100 shadow-sm">
                    {PROJECT_ROLE_OPTIONS.map((role) => (
                        <label
                            key={role.value}
                            className="flex items-center gap-1.5 cursor-pointer group"
                        >
                            <div className="relative flex items-center">
                                <input
                                    {...register("projectRole")}
                                    type="radio"
                                    value={role.value}
                                    className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border-2 border-gray-300 shadow-sm transition-all checked:border-[#0BD0D9] checked:bg-[#0BD0D9] hover:border-[#0BD0D9]/50"
                                />
                                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform text-white opacity-0 peer-checked:opacity-100">
                                    <Check className="h-2 w-2" />
                                </span>
                            </div>
                            <span className="text-sm text-gray-700 group-hover:text-[#09B8C0] transition-colors font-medium">
                                {role.label}
                            </span>
                        </label>
                    ))}
                </div>
                {errors.projectRole && (
                    <p className="mt-0.5 text-xs text-red-500">
                        {errors.projectRole.message}
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0BD0D9] hover:bg-[#09B8C0] text-white rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
                {editingId ? (
                    <>
                        <Check className="w-4 h-4" />
                        {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                    </>
                ) : (
                    <>
                        <Plus className="w-4 h-4" />
                        {isSubmitting ? "กำลังเพิ่ม..." : "เพิ่มครู"}
                    </>
                )}
            </button>
        </form>
    );
}
