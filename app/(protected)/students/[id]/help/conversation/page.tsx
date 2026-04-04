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
import { getStudentDetail } from "@/lib/actions/student/main";
import { getColorConfig } from "@/lib/config/help-page-config";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { HelpPageHeader } from "@/components/student/help/HelpPageHeader";
import { requireAuth } from "@/lib/session";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ConversationGuidelinesPage({
    params,
}: PageProps) {
    const { id: studentId } = await params;

    // system_admin เป็น readonly — ไม่สามารถเข้าหน้า help ได้
    const session = await requireAuth();
    if (session.user.role === "system_admin") {
        redirect(`/students/${studentId}`);
    }

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
        <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-6">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-10 right-10 w-64 h-64 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow" />
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow delay-1000" />
                <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow delay-500" />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                <BackButton
                    href={`/students/${studentId}/help`}
                    label="กลับหน้าขั้นตอนการช่วยเหลือ"
                />

                <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/70 to-emerald-50/40 p-6 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] md:p-8">
                    {/* Corner decoration */}
                    <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-linear-to-br from-emerald-200/45 to-teal-300/35 blur-xl" />
                    {/* Shimmer */}
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-teal-300/30 to-transparent" />

                    <HelpPageHeader
                        studentName={studentName}
                        config={config}
                        icon={
                            <MessageCircle className="w-10 h-10 text-white" />
                        }
                        title="หลักการพูดคุยกับนักเรียน"
                    />

                    {/* Guidelines Content */}
                    <div className="mb-8 rounded-2xl border border-gray-200/80 bg-white/80 p-8 shadow-sm">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <ClipboardList className="w-6 h-6 text-gray-700" />
                            <span className="bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                แนวทางการช่วยเหลือ
                            </span>
                        </h2>
                        <ul className="space-y-4 text-gray-700">
                            <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-gray-100">
                                <Handshake className={`w-6 h-6 ${config.textColor} shrink-0 mt-0.5`} />
                                <span className="font-medium text-lg">
                                    สร้างความสัมพันธ์ที่ดีและความไว้วางใจกับนักเรียน
                                </span>
                            </li>
                            <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-gray-100">
                                <Ear className={`w-6 h-6 ${config.textColor} shrink-0 mt-0.5`} />
                                <span className="font-medium text-lg">
                                    รับฟังด้วยความเข้าใจ
                                    ไม่ตัดสินหรือวิพากษ์วิจารณ์
                                </span>
                            </li>
                            <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-gray-100">
                                <Lightbulb className={`w-6 h-6 ${config.textColor} shrink-0 mt-0.5`} />
                                <span className="font-medium text-lg">
                                    ให้ข้อมูลและทางเลือกที่เหมาะสม
                                    ไม่บังคับให้ตัดสินใจ
                                </span>
                            </li>
                            <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-gray-100">
                                <Hospital className={`w-6 h-6 ${config.textColor} shrink-0 mt-0.5`} />
                                <span className="font-medium text-lg">
                                    ประสานงานกับผู้เชี่ยวชาญด้านสุขภาพจิตเมื่อจำเป็น
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Back Button */}
                    <Link
                        href={`/students/${studentId}/help`}
                        className={`group flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r py-4 text-center text-lg font-bold text-white shadow-md transition-base hover:-translate-y-0.5 hover:shadow-lg ${config.gradient}`}
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        กลับหน้าขั้นตอนการช่วยเหลือ
                    </Link>
                </div>
            </div>
        </div>
    );
}
