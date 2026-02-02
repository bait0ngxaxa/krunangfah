"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Loader2 } from "lucide-react";
import { submitTeacherAssessment } from "@/lib/actions/activity";

interface TeacherAssessmentFormProps {
    studentId: string;
    studentName: string;
    activityProgressId: string;
    activityNumber: number;
    activityTitle: string;
    riskLevel: "orange" | "yellow" | "green";
}

const COLOR_CONFIG: Record<
    string,
    { gradient: string; bg: string; text: string }
> = {
    orange: {
        gradient: "from-orange-500 to-amber-500",
        bg: "bg-orange-500",
        text: "สีส้ม",
    },
    yellow: {
        gradient: "from-yellow-400 to-amber-400",
        bg: "bg-yellow-400",
        text: "สีเหลือง",
    },
    green: {
        gradient: "from-green-500 to-emerald-500",
        bg: "bg-green-500",
        text: "สีเขียว",
    },
};

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
                alert(result.error || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            console.error("Submit error:", error);
            alert("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <Link
                    href={`/students/${studentId}`}
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-pink-50 px-4 py-2 rounded-full mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>กลับหน้าข้อมูลนักเรียน</span>
                </Link>

                <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 w-full h-2 bg-linear-to-r ${config.gradient}`}
                    />

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div
                            className={`w-20 h-20 ${config.bg} rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4`}
                        >
                            <ClipboardCheck className="w-10 h-10" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                            แบบประเมินจากใบงาน
                        </h1>
                        <p className="text-gray-600">
                            {activityTitle} • {studentName}
                        </p>
                    </div>

                    {/* Part 1: Problem Assessment */}
                    <div className="bg-blue-50 rounded-2xl p-6 md:p-8 mb-6">
                        <h2 className="text-xl font-bold text-blue-800 text-center mb-6">
                            จากใบงานทั้ง 2 ใบ
                            <br />
                            คุณครูคิดว่าเด็กคนนี้มีปัญหาอะไรบ้าง
                        </h2>

                        {/* Internal Problems */}
                        <div className="mb-6">
                            <div className="mb-3">
                                <span className="text-blue-700 font-bold">
                                    ปัญหาภายใน
                                </span>
                                <span className="text-blue-600 text-sm ml-2">
                                    หมายถึง ปัญหาที่เกิดขึ้นจากความคิด
                                    ความรู้สึก และโลกภายในจิตใจของเด็ก เช่น
                                    การขาดความมั่นใจในตนเอง
                                    การมองว่าตนเองไม่มีคุณค่า
                                    การรู้สึกด้อยกว่าผู้อื่น
                                </span>
                            </div>
                            <textarea
                                value={internalProblems}
                                onChange={(e) =>
                                    setInternalProblems(e.target.value)
                                }
                                placeholder="กรอกข้อความ"
                                className="w-full h-32 p-4 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                            />
                        </div>

                        {/* External Problems */}
                        <div>
                            <div className="mb-3">
                                <span className="text-blue-700 font-bold">
                                    ปัญหาภายนอก
                                </span>
                                <span className="text-blue-600 text-sm ml-2">
                                    หมายถึง
                                    ปัญหาที่เกิดจากสภาพแวดล้อมและปัจจัยรอบตัวเด็ก
                                    เช่น การถูกเพื่อนล้อเลียนหรือกลั่นแกล้ง
                                    ปัญหาภายในครอบครัว ปัญหาด้านการเงิน เป็นต้น
                                </span>
                            </div>
                            <textarea
                                value={externalProblems}
                                onChange={(e) =>
                                    setExternalProblems(e.target.value)
                                }
                                placeholder="กรอกข้อความ"
                                className="w-full h-32 p-4 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Part 2: Problem Type Selection */}
                    <div className="bg-gray-50 rounded-2xl p-6 md:p-8 mb-8">
                        <h2 className="text-xl font-bold text-gray-800 text-center mb-6">
                            จากการดูใบงานแล้ว คุณครูคิดว่าเด็ก
                            <br />
                            คนนี้มีปัญหาภายนอกหรือภายใน
                            <br />
                            มากกว่ากัน
                        </h2>

                        <div className="flex flex-col gap-4 max-w-xs mx-auto">
                            <button
                                onClick={() => setProblemType("internal")}
                                className={`py-4 px-8 rounded-xl font-bold text-lg transition-all ${
                                    problemType === "internal"
                                        ? "bg-blue-600 text-white ring-4 ring-blue-300"
                                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                }`}
                            >
                                ปัญหาภายใน
                            </button>
                            <button
                                onClick={() => setProblemType("external")}
                                className={`py-4 px-8 rounded-xl font-bold text-lg transition-all ${
                                    problemType === "external"
                                        ? "bg-blue-600 text-white ring-4 ring-blue-300"
                                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                }`}
                            >
                                ปัญหาภายนอก
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitting}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                            canSubmit
                                ? `bg-linear-to-r ${config.gradient} text-white hover:opacity-90`
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            "บันทึกและไปกิจกรรมถัดไป"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
