import { BookOpen, Clock, Lightbulb, Info } from "lucide-react";

interface UpskillVideo {
    id: number;
    title: string;
    description: string;
    embedUrl: string;
    duration: string;
}

const UPSKILL_VIDEOS: UpskillVideo[] = [
    {
        id: 1,
        title: "การทำความเข้าใจสุขภาพจิตวัยรุ่น",
        description: "เรียนรู้พื้นฐานการดูแลสุขภาพจิตของนักเรียนวัยรุ่น",
        embedUrl: "https://www.youtube.com/embed/1i9OktVsTWo",
        duration: "15 นาที",
    },
    {
        id: 2,
        title: "การสังเกตสัญญาณเตือนภัยทางจิตใจ",
        description:
            "วิธีการสังเกตและระบุสัญญาณเตือนภัยของปัญหาสุขภาพจิตในนักเรียน",
        embedUrl: "https://www.youtube.com/embed/DxIDKZHW3-E",
        duration: "20 นาที",
    },
    {
        id: 3,
        title: "เทคนิคการสนทนากับนักเรียนที่มีปัญหา",
        description: "เรียนรู้เทคนิคการสื่อสารและสร้างความไว้วางใจกับนักเรียน",
        embedUrl: "https://www.youtube.com/embed/3bKuoH8CkFc",
        duration: "25 นาที",
    },
];

export function VideoUpskillTab() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                    <h2 className="mb-2 flex min-w-0 items-start gap-2 text-2xl font-bold text-emerald-700">
                        <BookOpen
                            className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600"
                            aria-hidden="true"
                        />
                        <span className="break-words">
                            อัพสกิลคุณครูผ่านวิดีโอ
                        </span>
                    </h2>
                    <p className="max-w-3xl text-sm font-medium leading-6 text-gray-700 sm:text-base">
                        เรียนรู้เทคนิคและความรู้สำหรับการดูแลสุขภาพจิตนักเรียนผ่านวิดีโอบทเรียน
                    </p>
                </div>
            </div>

            {/* Video List - 2x2 Grid Layout */}
            <div className="grid gap-6 md:grid-cols-2">
                {UPSKILL_VIDEOS.map((video) => (
                    <div
                        key={video.id}
                        className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-base duration-300 overflow-hidden border-2 border-gray-100 hover:-translate-y-1 flex flex-col"
                    >
                        {/* Video Embed */}
                        <div className="aspect-video bg-gray-100 relative shrink-0">
                            <iframe
                                className="w-full h-full relative z-0"
                                src={video.embedUrl}
                                title={video.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                loading="lazy"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                            />
                        </div>

                        {/* Video Info */}
                        <div className="p-6 relative overflow-hidden flex-1 flex flex-col">
                            <div className="relative z-10 mb-3 flex items-start justify-between gap-2">
                                <h3 className="min-w-0 break-words text-lg font-bold leading-7 text-gray-800 xl:text-xl">
                                    {video.title}
                                </h3>
                                <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm sm:text-sm">
                                    <Clock
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                    />
                                    {video.duration}
                                </span>
                            </div>
                            <p className="relative z-10 text-sm leading-6 text-gray-700 xl:text-base">
                                {video.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Additional Resources */}
            <div className="bg-white rounded-2xl p-6 border-2 border-blue-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Lightbulb
                        className="w-5 h-5 text-blue-500"
                        aria-hidden="true"
                    />
                    <span>เพิ่มเติม</span>
                </h3>
                <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                        <Info
                            className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-blue-600"
                            aria-hidden="true"
                        />
                        <span className="min-w-0 break-words">
                            วิดีโอเหล่านี้สามารถดูซ้ำได้ตลอดเวลาเพื่อทบทวนความรู้
                        </span>
                    </li>
                    <li className="flex items-start bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                        <Info
                            className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-blue-600"
                            aria-hidden="true"
                        />
                        <span className="min-w-0 break-words">
                            แนะนำให้ดูตามลำดับเพื่อความเข้าใจที่ดีที่สุดและครอบคลุมเนื้อหาทั้งหมด
                        </span>
                    </li>
                    <li className="flex items-start bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                        <Info
                            className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-blue-600"
                            aria-hidden="true"
                        />
                        <span className="min-w-0 break-words">
                            หากมีคำถามเพิ่มเติม
                            สามารถติดต่อทีมงานผู้เชี่ยวชาญได้ตลอดเวลา
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
