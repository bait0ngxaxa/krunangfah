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
                    <Package className="w-4 h-4" /> เครื่องมือ Healthy Emotion
                    Box
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
                <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-pink-200 ring-1 ring-pink-50 p-5 sm:p-6 mb-8 overflow-hidden group">
                    {/* Gradient accent bottom border */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-400 via-pink-400 to-rose-300 opacity-60" />
                    {/* Top shimmer */}
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-linear-to-br from-rose-200/20 to-pink-300/15 rounded-full blur-xl pointer-events-none" />

                    <div className="relative flex items-center gap-4 justify-center md:justify-start">
                        {/* Animated icon */}
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                            <div className="relative w-12 h-12 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-200/50 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                                <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                                <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                                    อัพสกิลสำหรับคุณครู
                                </span>
                            </h1>
                            <p className="text-sm text-gray-500">
                                เรียนรู้และพัฒนาทักษะในการดูแลสุขภาพจิตนักเรียน
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs Component */}
                <Tabs tabs={tabs} defaultTab="videos" />
            </div>
        </div>
    );
}
