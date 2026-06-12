import { Tabs, type Tab } from "@/components/ui/Tabs";
import { VideoUpskillTab } from "@/components/teacher/skill/VideoUpskillTab";
import { ToolsIntroTab } from "@/components/teacher/skill/ToolsIntroTab";
import { BookOpen, Package, GraduationCap } from "lucide-react";
import { PageBanner } from "@/components/ui/PageBanner";

export default function TeacherSkillPage() {
    const tabs: Tab[] = [
        {
            id: "videos",
            label: (
                <span className="flex min-w-0 items-center gap-1.5">
                    <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">อัพสกิลคุณครู</span>
                </span>
            ),
            content: <VideoUpskillTab />,
        },
        {
            id: "tools",
            label: (
                <span className="flex min-w-0 items-center gap-1.5">
                    <Package className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                        เครื่องมือ Healthy Emotion Box
                    </span>
                </span>
            ),
            content: <ToolsIntroTab />,
        },
    ];

    return (
        <div className="min-h-screen relative pb-12">
            <PageBanner
                title="อัพสกิลสำหรับคุณครู"
                subtitle="เรียนรู้และพัฒนาทักษะในการดูแลสุขภาพจิตนักเรียน"
                icon={GraduationCap}
                imageSrc="/image/upskills.webp"
                imageAlt="ภาพประกอบการพัฒนาทักษะคุณครู"
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 relative z-10 w-full space-y-6">
                {/* Tabs Component */}
                <Tabs tabs={tabs} defaultTab="videos" syncWithUrl />
            </div>
        </div>
    );
}
