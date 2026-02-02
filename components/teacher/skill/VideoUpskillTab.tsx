/**
 * Video Upskilling Tab
 * แท็บสำหรับอัพสกิลคุณครูผ่านวิดีโอ
 */

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
            <div className="bg-linear-to-r from-pink-50 to-purple-50 rounded-2xl p-6 border-2 border-pink-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    📚 อัพสกิลคุณครูผ่านวิดีโอ
                </h2>
                <p className="text-gray-600">
                    เรียนรู้เทคนิคและความรู้สำหรับการดูแลสุขภาพจิตนักเรียนผ่านวิดีโอบทเรียน
                </p>
            </div>

            {/* Video List */}
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
                {videos.map((video) => (
                    <div
                        key={video.id}
                        className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-pink-100"
                    >
                        {/* Video Embed */}
                        <div className="aspect-video bg-gray-100">
                            <iframe
                                className="w-full h-full"
                                src={video.embedUrl}
                                title={video.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>

                        {/* Video Info */}
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {video.title}
                                </h3>
                                <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full whitespace-nowrap ml-2">
                                    ⏱️ {video.duration}
                                </span>
                            </div>
                            <p className="text-gray-600">{video.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Additional Resources */}
            <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                    💡 เพิ่มเติม
                </h3>
                <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>วิดีโอเหล่านี้สามารถดูซ้ำได้ตลอดเวลา</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>
                            แนะนำให้ดูตามลำดับเพื่อความเข้าใจที่ดีที่สุด
                        </span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>หากมีคำถามสามารถติดต่อทีมงานได้ตลอดเวลา</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
