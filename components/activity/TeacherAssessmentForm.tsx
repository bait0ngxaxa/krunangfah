"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { submitTeacherAssessment } from "@/lib/actions/activity";
import {
    COLOR_CONFIG,
    ASSESSMENT_COLOR_CONFIG,
} from "./ActivityWorkspace/constants";

interface TeacherAssessmentFormProps {
    studentId: string;
    studentName: string;
    activityProgressId: string;
    activityNumber: number;
    activityTitle: string;
    riskLevel: "orange" | "yellow" | "green";
}

export function TeacherAssessmentForm({
    studentId,
    studentName,
    activityProgressId,
    activityNumber,
    activityTitle,
    riskLevel,
}: TeacherAssessmentFormProps) {
    const router = useRouter();
    const config = COLOR_CONFIG[riskLevel];
    const assessmentColors = ASSESSMENT_COLOR_CONFIG[riskLevel];

    const [internalProblems, setInternalProblems] = useState("");
    const [externalProblems, setExternalProblems] = useState("");
    const [problemType, setProblemType] = useState<
        "internal" | "external" | null
    >(null);
    const [submitting, setSubmitting] = useState(false);

    const canSubmit =
        internalProblems.trim() && externalProblems.trim() && problemType;

    const handleSubmit = async () => {
        if (!canSubmit) return;

        setSubmitting(true);
        try {
            const result = await submitTeacherAssessment(activityProgressId, {
                internalProblems,
                externalProblems,
                problemType,
            });

            if (result.success) {
                // Redirect to encouragement page with problem type and activity number
                router.push(
                    `/students/${studentId}/help/start/encouragement?type=${problemType}&activity=${activityNumber}`,
                );
            } else {
                toast.error(result.error || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            console.error("Submit error:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-white to-purple-50 py-10 px-4 bg-pattern-grid">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <Link
                    href={`/students/${studentId}`}
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-bold transition-all hover:bg-white/80 hover:shadow-sm px-5 py-2.5 rounded-2xl backdrop-blur-sm border border-transparent hover:border-pink-200 mb-8"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>กลับหน้าข้อมูลนักเรียน</span>
                </Link>

                <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-white/60 relative overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 w-full h-3 bg-linear-to-r ${config.gradient}`}
                    />

                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-white/50 rounded-full blur-2xl animate-pulse-slow" />
                            <div
                                className={`w-24 h-24 ${config.bg} rounded-3xl rotate-3 flex items-center justify-center text-white text-4xl shadow-xl relative z-10 transition-transform hover:rotate-6 hover:scale-110`}
                            >
                                <ClipboardCheck className="w-12 h-12" />
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
                            แบบประเมินจากใบงาน
                        </h1>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 rounded-full border border-pink-100 shadow-sm backdrop-blur-sm">
                            <span className="font-bold text-gray-700">
                                {activityTitle}
                            </span>
                            <span className="text-pink-300">•</span>
                            <span className="text-pink-600 font-medium">
                                {studentName}
                            </span>
                        </div>
                    </div>

                    {/* Part 1: Problem Assessment */}
                    <div
                        className={`${assessmentColors.bgLight} rounded-3xl p-8 md:p-10 mb-8 border border-white/50 shadow-inner`}
                    >
                        <h2
                            className={`text-2xl font-bold ${assessmentColors.textDark} text-center mb-8 flex flex-col gap-2`}
                        >
                            <span>จากใบงานทั้ง 2 ใบ</span>
                            <span className="opacity-80 text-lg">
                                คุณครูคิดว่าเด็กคนนี้มีปัญหาอะไรบ้าง
                            </span>
                        </h2>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Internal Problems */}
                            <div>
                                <div className="mb-4 bg-white/50 p-4 rounded-2xl backdrop-blur-sm border border-white/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div
                                            className={`w-3 h-3 rounded-full ${assessmentColors.button}`}
                                        />
                                        <span
                                            className={`${assessmentColors.textDark} font-bold text-lg`}
                                        >
                                            ปัญหาภายใน
                                        </span>
                                    </div>
                                    <p
                                        className={`${assessmentColors.text} text-sm leading-relaxed`}
                                    >
                                        ปัญหาที่เกิดจากความคิด ความรู้สึก
                                        และโลกภายในจิตใจ เช่น ขาดความมั่นใจ,
                                        รู้สึกไร้ค่า
                                    </p>
                                </div>
                                <textarea
                                    value={internalProblems}
                                    onChange={(e) =>
                                        setInternalProblems(e.target.value)
                                    }
                                    placeholder="ระบุปัญหาภายในที่พบ..."
                                    className={`w-full h-40 p-5 border-2 ${assessmentColors.border} bg-white rounded-2xl ${assessmentColors.borderFocus} focus:ring-4 ${assessmentColors.ringFocus} focus:ring-opacity-20 focus:outline-none resize-none transition-all shadow-sm`}
                                />
                            </div>

                            {/* External Problems */}
                            <div>
                                <div className="mb-4 bg-white/50 p-4 rounded-2xl backdrop-blur-sm border border-white/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div
                                            className={`w-3 h-3 rounded-full ${assessmentColors.button}`}
                                        />
                                        <span
                                            className={`${assessmentColors.textDark} font-bold text-lg`}
                                        >
                                            ปัญหาภายนอก
                                        </span>
                                    </div>
                                    <p
                                        className={`${assessmentColors.text} text-sm leading-relaxed`}
                                    >
                                        ปัญหาจากสภาพแวดล้อมและปัจจัยรอบตัว เช่น
                                        การถูกกลั่นแกล้ง, ปัญหาครอบครัว
                                    </p>
                                </div>
                                <textarea
                                    value={externalProblems}
                                    onChange={(e) =>
                                        setExternalProblems(e.target.value)
                                    }
                                    placeholder="ระบุปัญหาภายนอกที่พบ..."
                                    className={`w-full h-40 p-5 border-2 ${assessmentColors.border} bg-white rounded-2xl ${assessmentColors.borderFocus} focus:ring-4 ${assessmentColors.ringFocus} focus:ring-opacity-20 focus:outline-none resize-none transition-all shadow-sm`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Part 2: Problem Type Selection */}
                    <div className="bg-gray-50/80 rounded-3xl p-8 md:p-10 mb-10 border border-gray-100 shadow-sm text-center">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-8 leading-relaxed">
                            จากการดูใบงานแล้ว คุณครูคิดว่าเด็กคนนี้
                            <br className="hidden md:block" />
                            มี{" "}
                            <span className="text-pink-600 underline decoration-wavy underline-offset-4">
                                ปัญหาหลัก
                            </span>{" "}
                            เป็นด้านใดมากกว่ากัน?
                        </h2>

                        <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-2xl mx-auto">
                            <button
                                onClick={() => setProblemType("internal")}
                                className={`flex-1 py-6 px-8 rounded-2xl font-bold text-lg transition-all transform hover:-translate-y-1 duration-300 relative group overflow-hidden ${
                                    problemType === "internal"
                                        ? `${assessmentColors.button} text-white shadow-xl scale-105 ring-4 ring-offset-2 ring-transparent`
                                        : "bg-white text-gray-600 hover:bg-gray-50 shadow-md hover:shadow-lg border border-gray-100"
                                }`}
                            >
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                    <span className="text-3xl">🧠</span>
                                    <span>ปัญหาภายใน</span>
                                </div>
                                {problemType === "internal" && (
                                    <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
                                )}
                            </button>

                            <button
                                onClick={() => setProblemType("external")}
                                className={`flex-1 py-6 px-8 rounded-2xl font-bold text-lg transition-all transform hover:-translate-y-1 duration-300 relative group overflow-hidden ${
                                    problemType === "external"
                                        ? `${assessmentColors.button} text-white shadow-xl scale-105 ring-4 ring-offset-2 ring-transparent`
                                        : "bg-white text-gray-600 hover:bg-gray-50 shadow-md hover:shadow-lg border border-gray-100"
                                }`}
                            >
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                    <span className="text-3xl">🌍</span>
                                    <span>ปัญหาภายนอก</span>
                                </div>
                                {problemType === "external" && (
                                    <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitting}
                        className={`w-full py-5 rounded-2xl font-bold text-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:shadow-pink-200/50 hover:-translate-y-1 active:scale-[0.98] ${
                            canSubmit
                                ? `bg-linear-to-r ${config.gradient} text-white`
                                : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200"
                        }`}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                กำลังบันทึกข้อมูล...
                            </>
                        ) : (
                            <>
                                <span>บันทึกผลการประเมิน</span>
                                <ArrowRight className="w-6 h-6" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
