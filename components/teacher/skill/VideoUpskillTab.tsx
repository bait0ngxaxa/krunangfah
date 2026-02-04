export function VideoUpskillTab() {
    const videos = [
        {
            id: 1,
            title: "การทำความเข้าใจสุขภาพจิตวัยรุ่น",
            description: "เรียนรู้พื้นฐานการดูแลสุขภาพจิตของนักเรียนวัยรุ่น",
            embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder
            duration: "15 นาที",
        },
        {
            id: 2,
            title: "การสังเกตสัญญาณเตือนภัยทางจิตใจ",
            description:
                "วิธีการสังเกตและระบุสัญญาณเตือนภัยของปัญหาสุขภาพจิตในนักเรียน",
            embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder
            duration: "20 นาที",
        },
        {
            id: 3,
            title: "เทคนิคการสนทนากับนักเรียนที่มีปัญหา",
            description:
                "เรียนรู้เทคนิคการสื่อสารและสร้างความไว้วางใจกับนักเรียน",
            embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder
            duration: "25 นาที",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-white/60 shadow-lg shadow-pink-100/50">
                <h2 className="text-2xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-2">
                    📚 อัพสกิลคุณครูผ่านวิดีโอ
                </h2>
                <p className="text-gray-600 font-medium">
                    เรียนรู้เทคนิคและความรู้สำหรับการดูแลสุขภาพจิตนักเรียนผ่านวิดีโอบทเรียน
                </p>
            </div>

            {/* Video List */}
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
                {videos.map((video) => (
                    <div
                        key={video.id}
                        className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-xl shadow-pink-100/40 hover:shadow-pink-200/50 transition-all duration-300 overflow-hidden border border-white/60 ring-1 ring-pink-50 hover:-translate-y-1"
                    >
                        {/* Video Embed */}
                        <div className="aspect-video bg-gray-100 relative">
                            <div className="absolute inset-0 bg-linear-to-br from-rose-500/10 to-purple-500/10 pointer-events-none z-10" />
                            <iframe
                                className="w-full h-full relative z-0"
                                src={video.embedUrl}
                                title={video.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>

                        {/* Video Info */}
                        <div className="p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-pink-50 rounded-bl-full opacity-50 pointer-events-none" />
                            <div className="flex items-start justify-between mb-3 relative z-10">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {video.title}
                                </h3>
                                <span className="text-sm font-bold text-pink-600 bg-pink-50 px-3 py-1.5 rounded-full whitespace-nowrap ml-2 border border-pink-100 shadow-sm">
                                    ⏱️ {video.duration}
                                </span>
                            </div>
                            <p className="text-gray-600 relative z-10">
                                {video.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Additional Resources */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-blue-100 shadow-md shadow-blue-50/50">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-xl">💡</span>
                    <span>เพิ่มเติม</span>
                </h3>
                <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                        <span className="mr-3 text-blue-500 font-bold">•</span>
                        <span>
                            วิดีโอเหล่านี้สามารถดูซ้ำได้ตลอดเวลาเพื่อทบทวนความรู้
                        </span>
                    </li>
                    <li className="flex items-start bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                        <span className="mr-3 text-blue-500 font-bold">•</span>
                        <span>
                            แนะนำให้ดูตามลำดับเพื่อความเข้าใจที่ดีที่สุดและครอบคลุมเนื้อหาทั้งหมด
                        </span>
                    </li>
                    <li className="flex items-start bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                        <span className="mr-3 text-blue-500 font-bold">•</span>
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
