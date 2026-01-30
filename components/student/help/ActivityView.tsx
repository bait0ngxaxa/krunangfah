import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Activity, ColorTheme } from "@/lib/config/help-page-config";
import { HelpPageHeader } from "./HelpPageHeader";
import { ActivityCard } from "./ActivityCard";

interface ActivityViewProps {
    studentName: string;
    studentId: string;
    config: ColorTheme;
    activities: Activity[];
}

export function ActivityView({
    studentName,
    studentId,
    config,
    activities,
}: ActivityViewProps) {
    const activityCount = activities.length;

    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4">
            <div className="max-w-5xl mx-auto">
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

                    <HelpPageHeader studentName={studentName} config={config} />

                    {/* Activity Count Badge */}
                    <div className="flex justify-center mb-8">
                        <div
                            className={`inline-flex items-center gap-2 px-6 py-3 ${config.lightBg} rounded-full`}
                        >
                            <span className="text-lg font-bold text-gray-800">
                                🎯 ต้องทำทั้งหมด {activityCount} กิจกรรม
                            </span>
                        </div>
                    </div>

                    {/* Activity Cards - 2 per row for better visibility */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
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
                            href={`/students/${studentId}/help/start`}
                            className={`flex items-center justify-center gap-2 py-4 px-8 bg-linear-to-r ${config.gradient} text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-lg shadow-lg`}
                        >
                            🚀 เริ่มทำกิจกรรม
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
