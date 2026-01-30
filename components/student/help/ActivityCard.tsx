import Image from "next/image";
import type { Activity, ColorTheme } from "@/lib/config/help-page-config";

interface ActivityCardProps {
    activity: Activity;
    index: number;
    config: ColorTheme;
}

export function ActivityCard({ activity, index, config }: ActivityCardProps) {
    return (
        <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-6">
                <div
                    className={`w-14 h-14 ${config.bg} rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg`}
                >
                    {index + 1}
                </div>
                <div className="min-w-0">
                    <h3 className="text-xl font-bold text-gray-800">
                        {activity.title}
                    </h3>
                    <p className="text-gray-500">{activity.description}</p>
                </div>
            </div>

            {/* Worksheet previews - Large horizontal layout */}
            <div className="flex flex-row gap-4 justify-center">
                {activity.worksheets.map((worksheet, wIndex) => (
                    <div
                        key={wIndex}
                        className="w-44 h-60 bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200 relative transform hover:scale-105 transition-transform"
                    >
                        <Image
                            src={worksheet}
                            alt={`${activity.title} ใบงาน ${wIndex + 1}`}
                            fill
                            className="object-contain p-1"
                            sizes="(max-width: 768px) 100vw, 33vw"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
