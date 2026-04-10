import Image from "next/image";
import type { Activity, ColorTheme } from "@/lib/config/help-page-config";

interface ActivityCardProps {
    activity: Activity;
    index: number;
    config: ColorTheme;
}

export function ActivityCard({ activity, index, config }: ActivityCardProps) {
    return (
        <div className="group relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white/90 p-5 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.4)] transition-base duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-24px_rgba(15,23,42,0.48)] content-visibility-auto sm:p-8">
            <div className="flex items-center gap-6 mb-8">
                <div
                    className={`relative flex h-16 w-16 shrink-0 rotate-3 items-center justify-center rounded-3xl text-3xl font-bold text-white shadow-lg ${config.bg}`}
                >
                    <span className="relative z-10 transition-transform group-hover:scale-110">
                        {index + 1}
                    </span>
                    <div className="absolute inset-0 bg-black/5 rounded-3xl transform scale-110 -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
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
            <div className="flex flex-row gap-6 justify-center overflow-x-auto pb-4">
                {activity.worksheets.map((worksheet, wIndex) => (
                    <div
                        key={wIndex}
                        className="group relative h-64 w-48 shrink-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md transition-base duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        <Image
                            src={worksheet}
                            alt={`${activity.title} ใบงาน ${wIndex + 1}`}
                            fill
                            className="object-cover"
                            quality={65}
                            sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                            <span
                                className={`rounded-full border border-white/80 px-2 py-1 text-xs font-bold text-white shadow-sm ${config.bg}`}
                            >
                                ใบที่ {wIndex + 1}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
