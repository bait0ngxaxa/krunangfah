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
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-8 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-10 right-10 w-64 h-64 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow" />
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow delay-1000" />
            </div>

            <div className="max-w-5xl mx-auto relative z-10">
                <BackButton
                    href={`/students/${studentId}`}
                    label="กลับหน้าข้อมูลนักเรียน"
                />

                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-6 md:p-8 border border-pink-200 ring-1 ring-pink-50 relative overflow-hidden animate-fade-in-up">
                    <div
                        className={`absolute top-0 left-0 w-full h-1.5 bg-linear-to-r ${config.gradient}`}
                    />

                    <HelpPageHeader studentName={studentName} config={config} />

                    {/* Activity Count Badge */}
                    <div className="flex justify-center mb-10">
                        <div
                            className={`inline-flex items-center gap-3 px-8 py-4 ${config.lightBg} rounded-2xl shadow-sm border border-white/50 backdrop-blur-sm`}
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
                            className={`flex items-center justify-center gap-3 py-4 px-10 bg-linear-to-r ${config.gradient} text-white rounded-xl font-bold hover:shadow-lg hover:shadow-pink-200 hover:-translate-y-0.5 transition-all text-xl shadow-md group`}
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
