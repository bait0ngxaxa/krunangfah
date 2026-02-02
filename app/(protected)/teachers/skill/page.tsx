import { Tabs, type Tab } from "@/components/ui/Tabs";
import { VideoUpskillTab, ToolsIntroTab } from "@/components/teacher";

/**
 * Teacher Skill Development Page
 * หน้าสำหรับอัพสกิลคุณครูและแนะนำเครื่องมือ
 */

export default function TeacherSkillPage() {
    const tabs: Tab[] = [
        {
            id: "videos",
            label: "📚 อัพสกิลคุณครู",
            content: <VideoUpskillTab />,
        },
        {
            id: "tools",
            label: "🧰 เครื่องมือ Healthy Emotion Box",
            content: <ToolsIntroTab />,
        },
    ];

    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-3">
                        🎓 อัพสกิลสำหรับคุณครู
                    </h1>
                    <p className="text-lg text-gray-600">
                        เรียนรู้และพัฒนาทักษะในการดูแลสุขภาพจิตนักเรียน
                    </p>
                </div>

                {/* Tabs Component */}
                <Tabs tabs={tabs} defaultTab="videos" />
            </div>
        </div>
    );
}
