import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
    ArrowLeft,
    MessageCircle,
    ClipboardList,
    Handshake,
    Ear,
    Lightbulb,
    Hospital,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { getStudentDetail } from "@/lib/actions/student";
import { getColorConfig } from "@/lib/config/help-page-config";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { HelpPageHeader } from "@/components/student/help";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ConversationGuidelinesPage({
    params,
}: PageProps) {
    const { id: studentId } = await params;

    const student = await getStudentDetail(studentId);
    if (!student) {
        notFound();
    }

    const latestResult = student.phqResults[0];
    if (!latestResult) {
        redirect(`/students/${studentId}`);
    }

    const riskLevel = latestResult.riskLevel as RiskLevel;
    const config = getColorConfig(riskLevel);
    const studentName = `${student.firstName} ${student.lastName}`;

    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-6 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-10 right-10 w-64 h-64 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow" />
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow delay-1000" />
                <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow delay-500" />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                <BackButton
                    href={`/students/${studentId}/help`}
                    label="กลับหน้าขั้นตอนการช่วยเหลือ"
                />

                <div className="relative bg-white/90 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-100/50 p-6 md:p-8 border border-pink-200 ring-1 ring-pink-50 overflow-hidden animate-fade-in-up">
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-40 h-40 bg-linear-to-br from-rose-200/45 to-pink-300/35 rounded-full blur-xl pointer-events-none" />
                    {/* Shimmer */}
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />

                    <div
                        className={`absolute top-0 left-0 w-full h-1.5 bg-linear-to-r ${config.gradient}`}
                    />

                    <HelpPageHeader
                        studentName={studentName}
                        config={config}
                        icon={
                            <MessageCircle className="w-10 h-10 text-white" />
                        }
                        title="หลักการพูดคุยกับนักเรียน"
                    />

                    {/* Guidelines Content */}
                    <div className="bg-white/60 rounded-2xl p-8 mb-8 border border-pink-50/50 shadow-sm">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <ClipboardList className="w-6 h-6 text-gray-700" />
                            <span className="bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                แนวทางการช่วยเหลือ
                            </span>
                        </h2>
                        <ul className="space-y-4 text-gray-700">
                            <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-pink-100">
                                <Handshake className="w-6 h-6 text-pink-500 shrink-0 mt-0.5" />
                                <span className="font-medium text-lg">
                                    สร้างความสัมพันธ์ที่ดีและความไว้วางใจกับนักเรียน
                                </span>
                            </li>
                            <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-pink-100">
                                <Ear className="w-6 h-6 text-pink-500 shrink-0 mt-0.5" />
                                <span className="font-medium text-lg">
                                    รับฟังด้วยความเข้าใจ
                                    ไม่ตัดสินหรือวิพากษ์วิจารณ์
                                </span>
                            </li>
                            <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-pink-100">
                                <Lightbulb className="w-6 h-6 text-pink-500 shrink-0 mt-0.5" />
                                <span className="font-medium text-lg">
                                    ให้ข้อมูลและทางเลือกที่เหมาะสม
                                    ไม่บังคับให้ตัดสินใจ
                                </span>
                            </li>
                            <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-pink-100">
                                <Hospital className="w-6 h-6 text-pink-500 shrink-0 mt-0.5" />
                                <span className="font-medium text-lg">
                                    ประสานงานกับผู้เชี่ยวชาญด้านสุขภาพจิตเมื่อจำเป็น
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Back Button */}
                    <Link
                        href={`/students/${studentId}/help`}
                        className={`block w-full py-4 bg-linear-to-r ${config.gradient} text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all text-center text-lg shadow-md flex items-center justify-center gap-2 group`}
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        กลับหน้าขั้นตอนการช่วยเหลือ
                    </Link>
                </div>
            </div>
        </div>
    );
}
