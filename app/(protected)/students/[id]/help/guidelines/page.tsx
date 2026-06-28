import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Pin } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { HelpPageHeader } from "@/components/student/help/HelpPageHeader";
import { getStudentDetail } from "@/lib/actions/student/main";
import { getColorConfig } from "@/lib/config/help-page-config";
import { requireAuth } from "@/lib/auth/session";
import {
    studentHelpRoute,
    studentHelpStartRoute,
    studentRoute,
} from "@/lib/constants/student-routes";
import {
    getLatestPhqResult,
    getRequestedOrLatestPhqResult,
} from "@/lib/utils/phq-result-selection";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { getStudentActionBlockedMessage } from "@/lib/constants/student-status";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ phqResultId?: string }>;
}

export default async function GuidelinesPage({
    params,
    searchParams,
}: PageProps) {
    const { id: studentId } = await params;
    const { phqResultId } = await searchParams;

    // Worksheet guideline flow is teacher-facing; system_admin is read-only.
    const session = await requireAuth();
    if (session.user.role === "system_admin") {
        redirect(studentRoute(studentId));
    }

    const student = await getStudentDetail(studentId);
    if (!student) {
        redirect(studentRoute(studentId));
    }
    const activePhqResult = student
        ? getLatestPhqResult(student.phqResults)
        : null;
    const selectedPhqResult = student
        ? getRequestedOrLatestPhqResult(student.phqResults, phqResultId)
        : null;

    if (!selectedPhqResult) {
        redirect(studentHelpRoute(studentId));
    }

    const statusLockedMessage = getStudentActionBlockedMessage(student.status);
    const canStartActivities =
        activePhqResult?.id !== undefined &&
        selectedPhqResult.id !== undefined &&
        activePhqResult.id === selectedPhqResult.id &&
        !statusLockedMessage;
    const startHref = studentHelpStartRoute(studentId, phqResultId);
    const backHref = canStartActivities
        ? startHref
        : studentHelpRoute(studentId);
    const riskLevel = selectedPhqResult.riskLevel as RiskLevel;
    const config = getColorConfig(riskLevel);
    const studentName = `${student.firstName} ${student.lastName}`;

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-6">
            <div className="max-w-4xl mx-auto">
                <BackButton href={backHref} label="กลับหน้าใบงาน" />

                <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/70 to-emerald-50/40 p-6 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] md:p-8">
                    <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-linear-to-br from-emerald-200/45 to-teal-300/35 blur-xl" />
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-teal-300/30 to-transparent" />

                    <HelpPageHeader
                        studentName={studentName}
                        config={config}
                        icon={<BookOpen className="w-10 h-10 text-white" />}
                        title="หลักการใช้ใบงาน"
                    />

                    <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-6 shadow-sm md:p-8">
                        <div
                            className={`mb-6 rounded-2xl border px-5 py-4 ${config.borderColor} ${config.lightBg}`}
                        >
                            <h3
                                className={`mb-2 flex items-center gap-1.5 font-bold ${config.textColor}`}
                            >
                                <Pin className="w-4 h-4" />
                                หมายเหตุ
                            </h3>
                            <p className={`text-sm font-medium ${config.textColor}`}>
                                เนื้อหาหลักการใช้ใบงานจะถูกเพิ่มในภายหลัง
                            </p>
                        </div>

                        <h2 className="mb-4 text-xl font-bold text-gray-800">
                            วิธีการใช้ใบงาน
                        </h2>
                        <ol className="space-y-3 text-gray-700">
                            <li>อ่านคำแนะนำในแต่ละกิจกรรมอย่างละเอียด</li>
                            <li>ทำใบงานตามลำดับที่กำหนด</li>
                            <li>ใช้เวลาคิดและสำรวจตัวเองอย่างจริงจัง</li>
                            <li>ปรึกษาครูหากมีข้อสงสัย</li>
                        </ol>
                    </div>

                    <div className="mt-8 border-t border-gray-200 pt-6">
                        {canStartActivities ? (
                            <Link
                                href={startHref}
                                className={`group flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r py-4 text-center text-lg font-bold text-white shadow-md transition-base hover:-translate-y-0.5 hover:shadow-lg ${config.gradient}`}
                            >
                                กลับหน้าใบงาน
                            </Link>
                        ) : (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-center text-sm font-medium text-amber-700 shadow-sm">
                                {statusLockedMessage ??
                                    "กำลังดูข้อมูลย้อนหลัง จึงเริ่มทำกิจกรรมได้เฉพาะผลคัดกรองล่าสุดของนักเรียน"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
