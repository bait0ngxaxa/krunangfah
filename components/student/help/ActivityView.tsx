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
        <div className="min-h-screen bg-slate-50 py-8 px-4 relative overflow-hidden">
            <div className="max-w-5xl mx-auto relative z-10">
                <BackButton
                    href={`/students/${studentId}`}
                    label="กลับหน้าข้อมูลนักเรียน"
                />

                <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 border-2 border-gray-100 relative overflow-hidden animate-fade-in-up">
                    <div
                        className={`absolute top-0 left-0 w-full h-1.5 ${config.bg}`}
                    />

                    <HelpPageHeader studentName={studentName} config={config} />

                    {/* Activity Count Badge */}
                    <div className="flex justify-center mb-10">
                        <div
                            className={`inline-flex items-center gap-3 px-5 py-3 sm:px-8 sm:py-4 ${config.lightBg} rounded-2xl shadow-sm border border-white/50 backdrop-blur-sm`}
                        >
                            <Target className="w-6 h-6 text-gray-800 animate-bounce" />
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
                            className={`flex items-center justify-center gap-3 py-4 px-6 sm:px-10 ${config.bg} text-white rounded-xl font-bold hover:shadow-md hover:-translate-y-0.5 transition-all text-base sm:text-xl shadow-sm group`}
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
