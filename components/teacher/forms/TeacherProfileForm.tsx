"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    teacherProfileSchema,
    type TeacherProfileFormData,
} from "@/lib/validations/teacher.validation";
import {
    createTeacherProfile,
    getAcademicYears,
} from "@/lib/actions/teacher.actions";
import type { AcademicYear } from "@/types/teacher.types";

export function TeacherProfileForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<TeacherProfileFormData>({
        resolver: zodResolver(teacherProfileSchema),
        defaultValues: {
            advisoryClass: "ทุกห้อง",
        },
    });

    useEffect(() => {
        const loadAcademicYears = async () => {
            const years = await getAcademicYears();
            setAcademicYears(years);
        };
        loadAcademicYears();
    }, []);

    const onSubmit = async (data: TeacherProfileFormData) => {
        setIsLoading(true);
        setError("");

        try {
            const result = await createTeacherProfile(data);

            if (!result.success) {
                setError(result.message);
                return;
            }

            // Redirect to dashboard - session will be refreshed on next request
            router.push("/dashboard");
            router.refresh();
        } catch (err) {
            console.error("Create teacher profile error:", err);
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    {error}
                </div>
            )}

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

            <div>
                <label
                    htmlFor="schoolName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    ชื่อโรงเรียน <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("schoolName")}
                    type="text"
                    id="schoolName"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="กรอกชื่อโรงเรียน"
                />
                {errors.schoolName && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.schoolName.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="age"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    อายุ <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("age", { valueAsNumber: true })}
                    type="number"
                    id="age"
                    min="18"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="กรอกอายุ"
                />
                {errors.age && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.age.message}
                    </p>
                )}
            </div>

            {/* Hidden field for advisoryClass - school_admin ไม่ต้องเลือกห้อง */}
            <input
                type="hidden"
                {...register("advisoryClass")}
                value="ทุกห้อง"
            />

            <div>
                <label
                    htmlFor="academicYearId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    ปีการศึกษา/เทอม <span className="text-red-500">*</span>
                </label>
                <select
                    {...register("academicYearId")}
                    id="academicYearId"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                    <option value="">เลือกปีการศึกษา/เทอม</option>
                    {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                            {year.year}/{year.semester}{" "}
                            {year.isCurrent && "(ปัจจุบัน)"}
                        </option>
                    ))}
                </select>
                {errors.academicYearId && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.academicYearId.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="schoolRole"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    บทบาทหน้าที่ในโรงเรียน{" "}
                    <span className="text-red-500">*</span>
                </label>
                <input
                    {...register("schoolRole")}
                    type="text"
                    id="schoolRole"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="เช่น ครูประจำชั้น, หัวหน้ากลุ่มสาระ"
                />
                {errors.schoolRole && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.schoolRole.message}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="projectRole"
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    บทบาทหน้าที่ในโครงการครูนางฟ้า{" "}
                    <span className="text-red-500">*</span>
                </label>
                <select
                    {...register("projectRole")}
                    id="projectRole"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                    <option value="">เลือกบทบาท</option>
                    <option value="lead">ทีมนำ</option>
                    <option value="care">ทีมดูแล</option>
                    <option value="coordinate">ทีมประสาน</option>
                </select>
                {errors.projectRole && (
                    <p className="mt-1 text-sm text-red-600">
                        {errors.projectRole.message}
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-linear-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
                {isLoading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
        </form>
    );
}
