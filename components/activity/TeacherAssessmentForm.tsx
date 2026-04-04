"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ClipboardCheck,
    Loader2,
    ArrowRight,
    Brain,
    Globe,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { toast } from "sonner";
import { submitTeacherAssessment } from "@/lib/actions/activity";
import {
    getWorkspaceColorConfig,
    getAssessmentColors,
} from "./ActivityWorkspace/constants";

interface TeacherAssessmentFormProps {
    studentId: string;
    studentName: string;
    activityProgressId: string;
    activityNumber: number;
    activityTitle: string;
    riskLevel: "orange" | "yellow" | "green";
    phqResultId?: string;
}

export function TeacherAssessmentForm({
    studentId,
    studentName,
    activityProgressId,
    activityNumber,
    activityTitle,
    riskLevel,
    phqResultId,
}: TeacherAssessmentFormProps) {
    const router = useRouter();
    const config = getWorkspaceColorConfig(riskLevel);
    const assessmentColors = getAssessmentColors(riskLevel);

    const [internalProblems, setInternalProblems] = useState("");
    const [externalProblems, setExternalProblems] = useState("");
    const [problemType, setProblemType] = useState<
        "internal" | "external" | null
    >(null);
    const [submitting, setSubmitting] = useState(false);
    const submitLockRef = useRef(false);

    const canSubmit =
        internalProblems.trim() && externalProblems.trim() && problemType;

    const handleSubmit = async () => {
        if (!canSubmit || submitLockRef.current) return;

        submitLockRef.current = true;
        setSubmitting(true);
        try {
            const result = await submitTeacherAssessment(activityProgressId, {
                internalProblems,
                externalProblems,
                problemType,
            });

            if (result.success) {
                // Redirect to encouragement page with problem type and activity number
                const phqParam = phqResultId
                    ? `&phqResultId=${phqResultId}`
                    : "";
                router.push(
                    `/students/${studentId}/help/start/encouragement?type=${problemType}&activity=${activityNumber}${phqParam}`,
                );
            } else {
                toast.error(result.error || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            console.error("Submit error:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSubmitting(false);
            submitLockRef.current = false;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-4xl mx-auto">
                <BackButton
                    href={`/students/${studentId}`}
                    label="กลับหน้าข้อมูลนักเรียน"
                />

                <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/70 to-emerald-50/40 p-8 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] md:p-12">
                    <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-emerald-200/35 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-cyan-200/25 blur-3xl" />
                    {/* Header */}
                    <div className="relative z-10 mb-12 text-center">
                        <div className="relative inline-block mb-6">
                            <div
                                className={`w-24 h-24 ${config.bg} rounded-3xl rotate-3 flex items-center justify-center text-white text-4xl shadow-xl relative z-10 transition-transform hover:rotate-6 hover:scale-110`}
                            >
                                <ClipboardCheck className="w-12 h-12" />
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                            แบบประเมินจากใบงาน
                        </h1>
                        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-4 py-2 shadow-sm">
                            <span className="font-bold text-gray-700">
                                {activityTitle}
                            </span>
                            <span className={config.separatorColor}>•</span>
                            <span className={`font-medium ${config.textColor}`}>
                                {studentName}
                            </span>
                        </div>
                    </div>

                    {/* Part 1: Problem Assessment */}
                    <div className={`${assessmentColors.bgLight} mb-8 rounded-3xl border border-gray-200/60 p-8 shadow-sm md:p-10`}>
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
                                <div className="mb-4 bg-white p-4 rounded-xl border-2 border-gray-100">
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
                                    className={`w-full h-40 p-5 border-2 ${assessmentColors.border} bg-white rounded-2xl ${assessmentColors.borderFocus} focus:ring-4 ${assessmentColors.ringFocus} focus:ring-opacity-20 focus:outline-none resize-none transition-base shadow-sm`}
                                />
                            </div>

                            {/* External Problems */}
                            <div>
                                <div className="mb-4 bg-white p-4 rounded-xl border-2 border-gray-100">
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
                                    className={`w-full h-40 p-5 border-2 ${assessmentColors.border} bg-white rounded-2xl ${assessmentColors.borderFocus} focus:ring-4 ${assessmentColors.ringFocus} focus:ring-opacity-20 focus:outline-none resize-none transition-base shadow-sm`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Part 2: Problem Type Selection */}
                    <div className="mb-10 rounded-3xl border border-gray-200/80 bg-white/85 p-8 text-center shadow-sm md:p-10">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-8 leading-relaxed">
                            จากการดูใบงานแล้ว คุณครูคิดว่าเด็กคนนี้
                            <br className="hidden md:block" />
                            มี{" "}
                            <span className="text-cyan-600 underline decoration-wavy underline-offset-4">
                                ปัญหาหลัก
                            </span>{" "}
                            เป็นด้านใดมากกว่ากัน?
                        </h2>

                        <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-2xl mx-auto">
                            <button
                                onClick={() => setProblemType("internal")}
                                className={`flex-1 py-6 px-8 rounded-2xl font-bold text-lg transition-base transform hover:-translate-y-1 duration-300 relative group overflow-hidden ${
                                    problemType === "internal"
                                        ? `${assessmentColors.button} text-white shadow-xl scale-105 ring-4 ring-offset-2 ring-transparent`
                                        : "bg-white text-gray-600 hover:bg-gray-50 shadow-md hover:shadow-lg border border-gray-100"
                                }`}
                            >
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                    <Brain className="w-8 h-8" />
                                    <span>ปัญหาภายใน</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setProblemType("external")}
                                className={`flex-1 py-6 px-8 rounded-2xl font-bold text-lg transition-base transform hover:-translate-y-1 duration-300 relative group overflow-hidden ${
                                    problemType === "external"
                                        ? `${assessmentColors.button} text-white shadow-xl scale-105 ring-4 ring-offset-2 ring-transparent`
                                        : "bg-white text-gray-600 hover:bg-gray-50 shadow-md hover:shadow-lg border border-gray-100"
                                }`}
                            >
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                    <Globe className="w-8 h-8" />
                                    <span>ปัญหาภายนอก</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitting}
                            className={`w-full py-5 rounded-2xl font-bold text-xl transition-base flex items-center justify-center gap-3 hover:-translate-y-1 active:scale-[0.98] ${
                            canSubmit
                                ? "bg-cyan-500 text-white shadow-sm hover:bg-cyan-600"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200"
                        }`}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                กำลังบันทึกข้อมูล…
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
