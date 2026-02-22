"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import {
    Building2,
    LayoutGrid,
    Users,
    ClipboardCheck,
    ArrowRight,
    ArrowLeft,
    Check,
} from "lucide-react";
import { createSchoolAndLink } from "@/lib/actions/school-setup.actions";
import { ClassListEditor } from "@/components/school/ClassListEditor";
import { TeacherRosterEditor } from "@/components/school/TeacherRosterEditor";
import { SetupSummary } from "@/components/school/SetupSummary";
import type {
    SchoolClassItem,
    TeacherRosterItem,
} from "@/types/school-setup.types";

const schoolInfoSchema = z.object({
    name: z.string().min(1, "กรุณากรอกชื่อโรงเรียน"),
    province: z.string().optional(),
});

type SchoolInfoData = z.infer<typeof schoolInfoSchema>;

const STEPS = [
    { label: "ข้อมูลโรงเรียน", icon: Building2 },
    { label: "ห้องเรียน", icon: LayoutGrid },
    { label: "รายชื่อครู", icon: Users },
    { label: "สรุป", icon: ClipboardCheck },
] as const;

type StepIndex = 0 | 1 | 2 | 3;

interface SchoolSetupWizardProps {
    initialHasSchool?: boolean;
}

export function SchoolSetupWizard({
    initialHasSchool = false,
}: SchoolSetupWizardProps) {
    const { update: updateSession } = useSession();
    const [step, setStep] = useState<StepIndex>(0);
    const [classes, setClasses] = useState<SchoolClassItem[]>([]);
    const [roster, setRoster] = useState<TeacherRosterItem[]>([]);
    const [schoolInfo, setSchoolInfo] = useState<{
        name: string;
        province?: string;
    } | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);

    // Flag ป้องกัน server action revalidation redirect
    // ตั้ง true ก่อนเรียก server action → เมื่อ page re-render
    // (initialHasSchool เปลี่ยนเป็น true) จะไม่ redirect ทิ้งกลางทาง wizard
    const [wizardActive, setWizardActive] = useState(false);

    // ถ้ามีโรงเรียนแล้วและยังไม่เริ่ม wizard → redirect ไป dashboard
    // (กรณี user พิมพ์ URL ตรงมาหลัง setup เสร็จ)
    useEffect(() => {
        if (initialHasSchool && !wizardActive) {
            window.location.href = "/dashboard";
        }
    }, [initialHasSchool, wizardActive]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SchoolInfoData>({
        resolver: zodResolver(schoolInfoSchema),
    });

    async function onSchoolInfoSubmit(data: SchoolInfoData) {
        setServerError(null);

        // ต้องตั้ง flag ก่อนเรียก server action
        // เพราะ server action จะ trigger page revalidation
        // ซึ่งจะทำให้ initialHasSchool เปลี่ยนเป็น true
        // React 18+ batch state updates → commit ก่อน async yield
        setWizardActive(true);

        const result = await createSchoolAndLink(data);

        if (!result.success) {
            setWizardActive(false);
            setServerError(result.message);
            return;
        }

        // Save school info for summary
        setSchoolInfo({ name: data.name, province: data.province });

        // Refresh session so schoolId is up-to-date in token
        await updateSession();
        setStep(1);
    }

    function handleFinish() {
        // Hard redirect — layout เช็ค schoolId จาก DB โดยตรง ไม่พึ่ง JWT
        window.location.href = "/dashboard";
    }

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-0 mb-8">
                {STEPS.map(({ label, icon: Icon }, i) => (
                    <div key={label} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                                    i < step
                                        ? "bg-[#0BD0D9] border-[#0BD0D9] text-white shadow-sm"
                                        : i === step
                                          ? "border-[#0BD0D9] text-[#09B8C0] bg-cyan-50"
                                          : "border-gray-200 text-gray-400 bg-white"
                                }`}
                            >
                                {i < step ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Icon className="w-4 h-4" />
                                )}
                            </div>
                            <span
                                className={`text-[10px] sm:text-xs font-medium whitespace-nowrap ${i === step ? "text-[#09B8C0]" : "text-gray-400"}`}
                            >
                                {label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div
                                className={`w-8 sm:w-16 h-0.5 mb-4 mx-1 sm:mx-2 transition-all ${i < step ? "bg-[#0BD0D9]" : "bg-gray-200"}`}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 1 — School Info */}
            {step === 0 && (
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

                    <form
                        onSubmit={handleSubmit(onSchoolInfoSubmit)}
                        className="space-y-4"
                    >
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
                            {!isSubmitting && (
                                <ArrowRight className="w-4 h-4" />
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* Step 2 — Classes */}
            {step === 1 && (
                <div className="relative bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6 sm:p-8 overflow-hidden">
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-[#0BD0D9] flex items-center justify-center shadow-md">
                            <LayoutGrid className="w-5 h-5 text-white stroke-[2.5]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                ห้องเรียน
                            </h2>
                            <p className="text-sm text-gray-500">
                                เพิ่มห้องเรียนของโรงเรียน
                                (สามารถแก้ไขได้ภายหลัง)
                            </p>
                        </div>
                    </div>

                    <ClassListEditor
                        initialClasses={classes}
                        onUpdate={setClasses}
                    />

                    <div className="mt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0BD0D9] hover:bg-[#09B8C0] text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
                        >
                            ถัดไป
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    {classes.length === 0 && (
                        <p className="text-center text-xs text-gray-400 mt-2">
                            ข้ามได้ — เพิ่มห้องเรียนที่{" "}
                            <span className="text-emerald-500">
                                จัดการห้องเรียน
                            </span>{" "}
                            ในภายหลังได้เลย
                        </p>
                    )}
                </div>
            )}

            {/* Step 3 — Teacher Roster */}
            {step === 2 && (
                <div className="relative bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6 sm:p-8 overflow-hidden">
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-[#0BD0D9] flex items-center justify-center shadow-md">
                            <Users className="w-5 h-5 text-white stroke-[2.5]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                รายชื่อครู
                            </h2>
                            <p className="text-sm text-gray-500">
                                ลงข้อมูลครูทั้งหมดในโรงเรียน (เพื่อใช้ตอน invite
                                ภายหลัง)
                            </p>
                        </div>
                    </div>

                    <TeacherRosterEditor
                        initialRoster={roster}
                        schoolClasses={classes}
                        onUpdate={setRoster}
                    />

                    <div className="mt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="flex items-center justify-center gap-2 px-5 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-bold transition-colors hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            ย้อนกลับ
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0BD0D9] hover:bg-[#09B8C0] text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
                        >
                            ถัดไป
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    {roster.length === 0 && (
                        <p className="text-center text-xs text-gray-400 mt-2">
                            ข้ามได้ — เพิ่มรายชื่อครูที่หลังจากตั้งค่าเสร็จ
                        </p>
                    )}
                </div>
            )}

            {/* Step 4 — Summary */}
            {step === 3 && (
                <div className="relative bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6 sm:p-8 overflow-hidden">
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-[#34D399] flex items-center justify-center shadow-md">
                            <ClipboardCheck className="w-5 h-5 text-white stroke-[2.5]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                สรุปข้อมูล
                            </h2>
                            <p className="text-sm text-gray-500">
                                ตรวจสอบข้อมูลทั้งหมดก่อนเสร็จสิ้น
                            </p>
                        </div>
                    </div>

                    <SetupSummary
                        schoolName={schoolInfo?.name ?? ""}
                        province={schoolInfo?.province}
                        classes={classes}
                        roster={roster}
                    />

                    <div className="mt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="flex items-center justify-center gap-2 px-5 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-bold transition-colors hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            ย้อนกลับ
                        </button>
                        <button
                            type="button"
                            onClick={handleFinish}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#34D399] hover:bg-[#10B981] text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
                        >
                            <Check className="w-4 h-4" />
                            เสร็จสิ้น — เข้าสู่ระบบ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
