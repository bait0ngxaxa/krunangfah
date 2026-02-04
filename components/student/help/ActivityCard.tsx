import Image from "next/image";
import type { Activity, ColorTheme } from "@/lib/config/help-page-config";

interface ActivityCardProps {
    activity: Activity;
    index: number;
    config: ColorTheme;
}

export function ActivityCard({ activity, index, config }: ActivityCardProps) {
    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/60 shadow-lg shadow-pink-100/50 hover:shadow-xl hover:shadow-pink-200/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-6 mb-8">
                <div
                    className={`w-16 h-16 ${config.bg} rounded-3xl rotate-3 flex items-center justify-center text-white text-3xl font-bold shrink-0 shadow-lg relative group`}
                >
                    <span className="relative z-10 group-hover:scale-110 transition-transform">
                        {index + 1}
                    </span>
                    <div className="absolute inset-0 bg-white/20 rounded-3xl blur-sm transform scale-110 -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                        {activity.title}
                    </h3>
                    <p className="text-gray-600 font-medium leading-relaxed">
                        {activity.description}
                    </p>
                </div>
            </div>

            {/* Worksheet previews - Large horizontal layout */}
            <div className="flex flex-row gap-6 justify-center overflow-x-auto pb-4 custom-scrollbar">
                {activity.worksheets.map((worksheet, wIndex) => (
                    <div
                        key={wIndex}
                        className="shrink-0 w-48 h-64 bg-white rounded-2xl overflow-hidden shadow-md shadow-pink-100/30 border-4 border-white relative transform hover:scale-105 hover:rotate-1 hover:shadow-xl hover:shadow-pink-200 transition-all duration-300 group"
                    >
                        <Image
                            src={worksheet}
                            alt={`${activity.title} ใบงาน ${wIndex + 1}`}
                            fill
                            className="object-cover transition-transform group-hover:scale-110"
                            sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                            <span className="text-white text-xs font-bold bg-white/20 backdrop-blur-md px-2 py-1 rounded-full border border-white/50">
                                ใบที่ {wIndex + 1}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
