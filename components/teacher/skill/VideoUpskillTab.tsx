import { BookOpen, Clock, Lightbulb, Info } from "lucide-react";

export function VideoUpskillTab() {
    const videos = [
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
            description:
                "เรียนรู้เทคนิคการสื่อสารและสร้างความไว้วางใจกับนักเรียน",
            embedUrl: "https://www.youtube.com/embed/3bKuoH8CkFc",
            duration: "25 นาที",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-emerald-600 mb-2 flex items-center gap-2 drop-shadow-sm">
                        <BookOpen className="w-6 h-6 text-emerald-500" />
                        อัพสกิลคุณครูผ่านวิดีโอ
                    </h2>
                    <p className="text-gray-600 font-medium">
                        เรียนรู้เทคนิคและความรู้สำหรับการดูแลสุขภาพจิตนักเรียนผ่านวิดีโอบทเรียน
                    </p>
                </div>
            </div>

            {/* Video List - 2x2 Grid Layout */}
            <div className="grid gap-6 md:grid-cols-2">
                {videos.map((video) => (
                    <div
                        key={video.id}
                        className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-2 border-emerald-100 hover:-translate-y-1 flex flex-col"
                    >
                        {/* Video Embed */}
                        <div className="aspect-video bg-gray-100 relative shrink-0">
                            <iframe
                                className="w-full h-full relative z-0"
                                src={video.embedUrl}
                                title={video.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>

                        {/* Video Info */}
                        <div className="p-6 relative overflow-hidden flex-1 flex flex-col">
                            <div className="flex items-start justify-between mb-3 relative z-10 gap-2">
                                <h3 className="text-lg xl:text-xl font-bold text-gray-800 line-clamp-2">
                                    {video.title}
                                </h3>
                                <span className="text-xs sm:text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full whitespace-nowrap border border-emerald-100 shadow-sm flex items-center gap-1 shrink-0">
                                    <Clock className="w-3.5 h-3.5" />{" "}
                                    {video.duration}
                                </span>
                            </div>
                            <p className="text-gray-600 relative z-10 text-sm xl:text-base line-clamp-3">
                                {video.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Additional Resources */}
            <div className="bg-white rounded-2xl p-6 border-2 border-blue-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-blue-500" />
                    <span>เพิ่มเติม</span>
                </h3>
                <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                        <Info className="w-4 h-4 mr-2 text-blue-500 shrink-0 mt-0.5" />
                        <span>
                            วิดีโอเหล่านี้สามารถดูซ้ำได้ตลอดเวลาเพื่อทบทวนความรู้
                        </span>
                    </li>
                    <li className="flex items-start bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                        <Info className="w-4 h-4 mr-2 text-blue-500 shrink-0 mt-0.5" />
                        <span>
                            แนะนำให้ดูตามลำดับเพื่อความเข้าใจที่ดีที่สุดและครอบคลุมเนื้อหาทั้งหมด
                        </span>
                    </li>
                    <li className="flex items-start bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                        <Info className="w-4 h-4 mr-2 text-blue-500 shrink-0 mt-0.5" />
                        <span>
                            หากมีคำถามเพิ่มเติม
                            สามารถติดต่อทีมงานผู้เชี่ยวชาญได้ตลอดเวลา
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
