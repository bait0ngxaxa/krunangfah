import Image from "next/image";
import type { Activity, ColorTheme } from "@/lib/config/help-page-config";

interface ActivityCardProps {
    activity: Activity;
    index: number;
    config: ColorTheme;
}

export function ActivityCard({ activity, index, config }: ActivityCardProps) {
    const hasSingleWorksheet = activity.worksheets.length === 1;

    return (
        <article className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white/90 p-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.4)] transition-base duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-24px_rgba(15,23,42,0.48)] content-visibility-auto sm:p-6">
            <div className="mb-5 flex min-w-0 items-start gap-4 sm:mb-6 sm:items-center sm:gap-5">
                <div
                    className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-bold shadow-md sm:h-14 sm:w-14 sm:text-2xl ${config.bg} ${config.foreground}`}
                >
                    <span className="relative z-10">
                        {index + 1}
                    </span>
                </div>
                <div className="min-w-0">
                    <h3 className="mb-1 break-words text-lg font-bold leading-7 text-gray-800 sm:text-xl">
                        {activity.title}
                    </h3>
                    <p className="text-sm font-medium leading-6 text-gray-600 sm:text-base">
                        {activity.description}
                    </p>
                </div>
            </div>

            <div
                className={
                    hasSingleWorksheet
                        ? "grid grid-cols-1 justify-items-center gap-3 sm:gap-4"
                        : "grid grid-cols-2 gap-3 sm:gap-4"
                }
            >
                {activity.worksheets.map((worksheet, wIndex) => (
                    <div
                        key={worksheet}
                        className={`relative aspect-[3/4] min-h-0 overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm transition-base duration-300 hover:-translate-y-0.5 hover:shadow-md ${hasSingleWorksheet ? "w-full max-w-48" : ""}`}
                    >
                        <Image
                            src={worksheet}
                            alt={`${activity.title} ใบงาน ${wIndex + 1}`}
                            fill
                            className="object-cover"
                            quality={70}
                            sizes="(max-width: 768px) 42vw, 12rem"
                        />
                        <div className="absolute inset-x-0 bottom-0 flex justify-center bg-linear-to-t from-black/70 to-transparent p-3">
                            <span
                                className={`rounded-full border border-white/80 px-2 py-1 text-xs font-bold shadow-sm ${config.bg} ${config.foreground}`}
                            >
                                ใบที่ {wIndex + 1}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </article>
    );
}
