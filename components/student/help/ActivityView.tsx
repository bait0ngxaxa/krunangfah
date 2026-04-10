import Link from "next/link";
import { Target, Rocket } from "lucide-react";
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
        <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8">
            <div className="max-w-5xl mx-auto relative z-10">
                <BackButton
                    href={studentRoute(studentId)}
                    label="กลับหน้าข้อมูลนักเรียน"
                />

                <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white to-slate-50 p-6 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] md:p-8">
                    <HelpPageHeader studentName={studentName} config={config} />

                    {/* Activity Count Badge */}
                    <div className="flex justify-center mb-10">
                        <div
                            className={`inline-flex items-center gap-3 rounded-2xl border border-gray-200/70 px-5 py-3 shadow-sm sm:px-8 sm:py-4 ${config.lightBg}`}
                        >
                            <Target className={`w-6 h-6 ${config.textColor}`} />
                            <span className="text-lg font-bold text-gray-800">
                                ต้องทำทั้งหมด {activityCount} กิจกรรม
                            </span>
                        </div>
                    </div>

                    {/* Activity Cards - 2 per row for better visibility */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        {activities.map((activity, index) => (
                            <ActivityCard
                                key={activity.id}
                                activity={activity}
                                index={index}
                                config={config}
                            />
                        ))}
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        {canStartActivities ? (
                            <Link
                                href={studentHelpStartRoute(studentId, phqResultId)}
                                className={`group flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-bold text-white shadow-md transition-base hover:-translate-y-0.5 hover:shadow-lg sm:px-10 sm:text-xl ${config.bg}`}
                            >
                                <Rocket className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                เริ่มทำกิจกรรม
                            </Link>
                        ) : (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-center text-sm font-medium text-amber-700 shadow-sm sm:max-w-xl">
                                {actionLockedMessage ??
                                    "ทำกิจกรรมได้เฉพาะผลคัดกรองล่าสุดของนักเรียน"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
