import Link from "next/link";
import type { ReactElement } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { buttonVariants } from "@/components/ui/Button";
import { studentRoute } from "@/lib/constants/student-routes";

interface ActivitySequenceCompleteProps {
    studentId: string;
    studentName: string;
    assessmentPeriodLabel: string;
    completedCount: number;
}

export function ActivitySequenceComplete({
    studentId,
    studentName,
    assessmentPeriodLabel,
    completedCount,
}: ActivitySequenceCompleteProps): ReactElement {
    const activityProgressRoute = `${studentRoute(studentId)}?tab=activities`;

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-8">
            <div className="mx-auto max-w-3xl">
                <BackButton
                    href={studentRoute(studentId)}
                    label="กลับหน้าข้อมูลนักเรียน"
                />
                <main className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-emerald-700">
                                ทำกิจกรรมครบแล้ว
                            </p>
                            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                                {assessmentPeriodLabel}
                            </h1>
                            <p className="mt-2 text-pretty text-slate-600">
                                {studentName} ทำกิจกรรมครบทั้ง {completedCount} กิจกรรมแล้ว
                            </p>
                        </div>
                    </div>
                    <div className="mt-6 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                        <ClipboardCheck
                            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                            aria-hidden="true"
                        />
                        <p>ไม่มีใบงานที่ต้องอัปโหลดหรือยืนยันเพิ่มเติมในรอบนี้</p>
                    </div>
                    <Link
                        href={activityProgressRoute}
                        className={buttonVariants({
                            variant: "primary",
                            size: "lg",
                            className: "mt-6 w-full sm:w-auto",
                        })}
                    >
                        ดูความคืบหน้ากิจกรรม
                    </Link>
                </main>
            </div>
        </div>
    );
}
