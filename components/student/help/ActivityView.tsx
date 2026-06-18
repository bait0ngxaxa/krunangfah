import Link from "next/link";
import { AlertCircle, ClipboardCheck, FileText, Rocket, Target } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import type { Activity, ColorTheme } from "@/lib/config/help-page-config";
import { HelpPageHeader } from "./HelpPageHeader";
import { ActivityCard } from "./ActivityCard";
import {
    studentHelpStartRoute,
    studentRoute,
} from "@/lib/constants/student-routes";

interface ActivityViewProps {
    studentName: string;
    studentId: string;
    config: ColorTheme;
    activities: Activity[];
    phqResultId: string;
    canStartActivities?: boolean;
    actionLockedMessage?: string;
}

interface StartActivityActionProps {
    studentId: string;
    phqResultId: string;
    config: ColorTheme;
    canStartActivities: boolean;
    actionLockedMessage?: string;
}

function ActivityCountBadge({
    activityCount,
    config,
}: {
    activityCount: number;
    config: ColorTheme;
}) {
    return (
        <div className="mb-8 flex justify-center">
            <div
                className={`flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200/70 px-4 py-3 text-center shadow-sm sm:w-auto sm:px-8 sm:py-4 ${config.lightBg}`}
            >
                <Target
                    className={`h-6 w-6 shrink-0 ${config.textColor}`}
                    aria-hidden="true"
                />
                <span className="text-base font-bold text-gray-800 sm:text-lg">
                    ต้องทำทั้งหมด {activityCount} กิจกรรม
                </span>
            </div>
        </div>
    );
}

function OnboardingSteps({ config }: { config: ColorTheme }) {
    return (
        <div className="mb-8 border-y border-slate-200/80 py-5">
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex min-w-0 gap-3">
                    <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${config.lightBg} ${config.textColor}`}
                    >
                        <Target className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-800">เช็กกิจกรรม</p>
                        <p className="text-sm leading-6 text-gray-600">
                            ดูจำนวนกิจกรรมที่เหมาะกับระดับคัดกรองนี้
                        </p>
                    </div>
                </div>
                <div className="flex min-w-0 gap-3">
                    <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${config.lightBg} ${config.textColor}`}
                    >
                        <FileText className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-800">เตรียมใบงาน</p>
                        <p className="text-sm leading-6 text-gray-600">
                            เปิดดูตัวอย่างก่อนพิมพ์หรือส่งให้นักเรียน
                        </p>
                    </div>
                </div>
                <div className="flex min-w-0 gap-3">
                    <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${config.lightBg} ${config.textColor}`}
                    >
                        <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-800">บันทึกต่อ</p>
                        <p className="text-sm leading-6 text-gray-600">
                            เริ่มกิจกรรมแล้วอัปโหลดใบงานเมื่อทำเสร็จ
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActivityList({
    activities,
    config,
}: {
    activities: Activity[];
    config: ColorTheme;
}) {
    if (activities.length === 0) {
        return (
            <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-amber-800">
                <div className="flex gap-3">
                    <AlertCircle
                        className="mt-0.5 h-5 w-5 shrink-0"
                        aria-hidden="true"
                    />
                    <p className="text-sm font-medium leading-6">
                        ยังไม่พบกิจกรรมสำหรับระดับคัดกรองนี้
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {activities.map((activity, index) => (
                <ActivityCard
                    key={activity.id}
                    activity={activity}
                    index={index}
                    config={config}
                />
            ))}
        </div>
    );
}

function StartActivityAction({
    studentId,
    phqResultId,
    config,
    canStartActivities,
    actionLockedMessage,
}: StartActivityActionProps) {
    if (!canStartActivities) {
        return (
            <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-medium leading-6 text-amber-800 shadow-sm sm:max-w-xl sm:px-6">
                <div className="flex gap-3">
                    <AlertCircle
                        className="mt-0.5 h-5 w-5 shrink-0"
                        aria-hidden="true"
                    />
                    <p>
                        {actionLockedMessage ??
                            "ทำกิจกรรมได้เฉพาะผลคัดกรองล่าสุดของนักเรียน"}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <Link
            href={studentHelpStartRoute(studentId, phqResultId)}
            className={`group flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-bold shadow-md transition-base hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 sm:w-auto sm:px-10 sm:text-xl ${config.bg} ${config.foreground}`}
        >
            <Rocket
                className="h-6 w-6 shrink-0 transition-transform group-hover:scale-110"
                aria-hidden="true"
            />
            เริ่มทำกิจกรรม
        </Link>
    );
}

export function ActivityView({
    studentName,
    studentId,
    config,
    activities,
    phqResultId,
    canStartActivities = true,
    actionLockedMessage,
}: ActivityViewProps) {
    const activityCount = activities.length;

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-50 px-3 py-4 sm:px-4 sm:py-8">
            <div className="relative z-10 mx-auto max-w-5xl">
                <BackButton
                    href={studentRoute(studentId)}
                    label="กลับหน้าข้อมูลนักเรียน"
                />

                <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-linear-to-br from-white to-slate-50 p-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] sm:rounded-3xl sm:p-6 md:p-8">
                    <HelpPageHeader studentName={studentName} config={config} />

                    <ActivityCountBadge
                        activityCount={activityCount}
                        config={config}
                    />
                    <OnboardingSteps config={config} />
                    <ActivityList activities={activities} config={config} />

                    <div className="flex flex-col justify-center gap-4 sm:flex-row">
                        <StartActivityAction
                            studentId={studentId}
                            phqResultId={phqResultId}
                            config={config}
                            canStartActivities={canStartActivities}
                            actionLockedMessage={actionLockedMessage}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
