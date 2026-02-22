/**
 * Tools Introduction Tab
 * แท็บสำหรับแนะนำเครื่องมือใน Healthy Emotion Box
 */

import { Package } from "lucide-react";
import {
    HEALTHY_EMOTION_TOOLS,
    COLOR_STYLES,
    BORDER_STYLES,
} from "@/lib/constants/healthyEmotionTools";

export function ToolsIntroTab() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-emerald-600 mb-2 flex items-center gap-2 drop-shadow-sm">
                        <Package className="w-6 h-6 text-emerald-500" />
                        เครื่องมือใน Healthy Emotion Box
                    </h2>
                    <p className="text-gray-600 font-medium">
                        ระบบเครื่องมือครบวงจร 9 ชิ้น
                        สำหรับการดูแลสุขภาพจิตนักเรียน
                    </p>
                </div>
            </div>

            {/* Tools Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {HEALTHY_EMOTION_TOOLS.map((tool) => (
                    <div
                        key={tool.id}
                        className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border-2 ${BORDER_STYLES[tool.color]} hover:-translate-y-1 relative group overflow-hidden flex flex-col`}
                    >
                        {/* Tool Header */}
                        <div className="flex flex-col items-center mb-4 relative z-10">
                            <div
                                className={`mb-4 p-5 rounded-2xl ${COLOR_STYLES[tool.color]} shadow-sm group-hover:scale-110 transition-transform duration-300`}
                            >
                                <tool.icon className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 text-center leading-tight">
                                {tool.name}
                            </h3>
                        </div>

                        {/* Tool Description */}
                        <p className="text-sm text-gray-600 text-center leading-relaxed relative z-10">
                            {tool.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
