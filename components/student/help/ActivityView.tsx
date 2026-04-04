import Link from "next/link";
import { Target, Rocket } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import type { Activity, ColorTheme } from "@/lib/config/help-page-config";
import { HelpPageHeader } from "./HelpPageHeader";
import { ActivityCard } from "./ActivityCard";

interface ActivityViewProps {
    studentName: string;
    studentId: string;
    config: ColorTheme;
    activities: Activity[];
    phqResultId: string;
}

export function ActivityView({
    studentName,
    studentId,
    config,
    activities,
    phqResultId,
}: ActivityViewProps) {
    const activityCount = activities.length;

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8">
            <div className="max-w-5xl mx-auto relative z-10">
                <BackButton
                    href={`/students/${studentId}`}
                    label="กลับหน้าข้อมูลนักเรียน"
                />

                <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/70 to-emerald-50/40 p-6 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] md:p-8">
                    <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-emerald-200/35 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-cyan-200/25 blur-3xl" />
                    <HelpPageHeader studentName={studentName} config={config} />

                    {/* Activity Count Badge */}
                    <div className="flex justify-center mb-10">
                        <div
                            className={`inline-flex items-center gap-3 rounded-2xl border border-gray-200/70 px-5 py-3 shadow-sm backdrop-blur-sm sm:px-8 sm:py-4 ${config.lightBg}`}
                        >
                            <Target className={`w-6 h-6 animate-bounce ${config.textColor}`} />
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
                        <Link
                            href={`/students/${studentId}/help/start?phqResultId=${phqResultId}`}
                            className={`group flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-bold text-white shadow-md transition-base hover:-translate-y-0.5 hover:shadow-lg sm:px-10 sm:text-xl ${config.bg}`}
                        >
                            <Rocket className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            เริ่มทำกิจกรรม
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
