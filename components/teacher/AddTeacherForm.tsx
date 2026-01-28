"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    teacherInviteSchema,
    type TeacherInviteFormData,
} from "@/lib/validations/teacher-invite.validation";
import { createTeacherInvite } from "@/lib/actions/teacher-invite.actions";
import { getAcademicYears } from "@/lib/actions/teacher.actions";
import { ClassSelector } from "@/components/ui/ClassSelector";

interface AcademicYear {
    id: string;
    year: number;
    semester: number;
}

const PROJECT_ROLES = [
    { value: "lead", label: "ทีมนำ" },
    { value: "care", label: "ทีมดูแล" },
    { value: "coordinate", label: "ทีมประสาน" },
];

export function AddTeacherForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [inviteLink, setInviteLink] = useState("");
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
        setValue,
        watch,
    } = useForm<TeacherInviteFormData>({
        resolver: zodResolver(teacherInviteSchema),
    });

    const advisoryClassValue = watch("advisoryClass") || "";

    useEffect(() => {
        const loadAcademicYears = async () => {
            const years = await getAcademicYears();
            setAcademicYears(years);
        };
        loadAcademicYears();
    }, []);

    const onSubmit = async (data: TeacherInviteFormData) => {
        setIsLoading(true);
        setError("");
        setSuccess("");
        setInviteLink("");

        try {
            const result = await createTeacherInvite(data);

            if (!result.success) {
                setError(result.message);
                return;
            }

            setSuccess("สร้างคำเชิญสำเร็จ!");
            if (result.inviteLink) {
                setInviteLink(result.inviteLink);
            }
            reset();
        } catch (err) {
            console.error("Create invite error:", err);
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        alert("คัดลอก Link แล้ว!");
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg">
                    {success}
                    {inviteLink && (
                        <div className="mt-2">
                            <p className="font-medium">
                                Link สำหรับครูผู้ดูแล:
                            </p>
                            <div className="flex gap-2 mt-1">
                                <input
                                    type="text"
                                    readOnly
                                    value={inviteLink}
                                    className="flex-1 px-2 py-1 text-xs border rounded bg-white"
                                />
                                <button
                                    type="button"
                                    onClick={copyToClipboard}
                                    className="px-3 py-1 text-xs bg-linear-to-r from-pink-500 to-purple-500 text-white rounded hover:from-pink-600 hover:to-purple-600"
                                >
                                    คัดลอก
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        อีเมล
                    </label>
                    <input
                        {...register("email")}
                        type="email"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="อายุ"
                    />
                    {errors.age && (
                        <p className="mt-1 text-sm text-red-600">
                            {errors.age.message}
                        </p>
                    )}
                </div>

                {/* Advisory Class */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        ชั้นที่ปรึกษา
                    </label>
                    <ClassSelector
                        value={advisoryClassValue}
                        onChange={(val) =>
                            setValue("advisoryClass", val, {
                                shouldValidate: true,
                            })
                        }
                        error={errors.advisoryClass?.message}
                    />
                </div>

                {/* Academic Year */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        ปีการศึกษา
                    </label>
                    <select
                        {...register("academicYearId")}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">เลือกปีการศึกษา</option>
                        {academicYears.map((year) => (
                            <option key={year.id} value={year.id}>
                                {year.year}/{year.semester}
                            </option>
                        ))}
                    </select>
                    {errors.academicYearId && (
                        <p className="mt-1 text-sm text-red-600">
                            {errors.academicYearId.message}
                        </p>
                    )}
                </div>

                {/* School Role */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        บทบาทหน้าที่ในโรงเรียน
                    </label>
                    <input
                        {...register("schoolRole")}
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="เช่น ครูประจำชั้น"
                    />
                    {errors.schoolRole && (
                        <p className="mt-1 text-sm text-red-600">
                            {errors.schoolRole.message}
                        </p>
                    )}
                </div>

                {/* Project Role */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        บทบาทหน้าที่ในโครงการครูนางฟ้า
                    </label>
                    <div className="flex gap-4">
                        {PROJECT_ROLES.map((role) => (
                            <label
                                key={role.value}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <input
                                    {...register("projectRole")}
                                    type="radio"
                                    value={role.value}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span>{role.label}</span>
                            </label>
                        ))}
                    </div>
                    {errors.projectRole && (
                        <p className="mt-1 text-sm text-red-600">
                            {errors.projectRole.message}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 bg-linear-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all duration-200 shadow-lg"
                >
                    {isLoading ? "กำลังสร้างคำเชิญ..." : "สร้างคำเชิญ"}
                </button>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                >
                    ยกเลิก
                </button>
            </div>
        </form>
    );
}
