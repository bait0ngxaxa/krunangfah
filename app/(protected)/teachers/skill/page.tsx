import { Tabs, type Tab } from "@/components/ui/Tabs";
import { VideoUpskillTab, ToolsIntroTab } from "@/components/teacher";
import { BookOpen, Package, GraduationCap } from "lucide-react";

export default function TeacherSkillPage() {
    const tabs: Tab[] = [
        {
            id: "videos",
            label: (
                <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" /> อัพสกิลคุณครู
                </span>
            ),
            content: <VideoUpskillTab />,
        },
        {
            id: "tools",
            label: (
                <span className="flex items-center gap-1.5">
                    <Package className="w-4 h-4" /> เครื่องมือ Healthy Emotion Box
                </span>
            ),
            content: <ToolsIntroTab />,
        },
    ];

    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-8 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-96 bg-linear-to-b from-rose-100/20 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-0 w-96 h-96 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/3 pointer-events-none" />
            <div className="absolute top-40 left-0 w-96 h-96 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/3 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Page Header */}
                <div className="mb-8 text-center md:text-left bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50">
                    <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-3 flex items-center gap-3 justify-center md:justify-start">
                        <GraduationCap className="w-8 h-8 text-rose-500" /> อัพสกิลสำหรับคุณครู
                    </h1>
                    <p className="text-lg text-gray-600 font-medium">
                        เรียนรู้และพัฒนาทักษะในการดูแลสุขภาพจิตนักเรียน
                    </p>
                </div>

                {/* Tabs Component */}
                <Tabs tabs={tabs} defaultTab="videos" />
            </div>
        </div>
    );
}
