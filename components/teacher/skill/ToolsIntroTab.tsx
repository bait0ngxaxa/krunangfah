/**
 * Tools Introduction Tab
 * แท็บสำหรับแนะนำเครื่องมือใน Healthy Emotion Box
 */

import { Package } from "lucide-react";
import {
    HEALTHY_EMOTION_TOOLS,
    COLOR_STYLES,
    BORDER_STYLES,
} from "@/constants/healthyEmotionTools";

export function ToolsIntroTab() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-white/60 shadow-lg shadow-pink-100/50">
                <h2 className="text-2xl font-bold bg-linear-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent mb-2 flex items-center gap-2">
                    <Package className="w-6 h-6 text-purple-500" />
                    เครื่องมือใน Healthy Emotion Box
                </h2>
                <p className="text-gray-600 font-medium">
                    ระบบเครื่องมือครบวงจร 9 ชิ้น สำหรับการดูแลสุขภาพจิตนักเรียน
                </p>
            </div>

            {/* Tools Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {HEALTHY_EMOTION_TOOLS.map((tool) => (
                    <div
                        key={tool.id}
                        className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-xl hover:shadow-pink-100/50 transition-all duration-300 p-6 border ${BORDER_STYLES[tool.color]} hover:-translate-y-1 relative group overflow-hidden`}
                    >
                        <div
                            className={`absolute top-0 right-0 w-24 h-24 bg-linear-to-bl ${COLOR_STYLES[tool.color]} opacity-10 rounded-bl-[100px] pointer-events-none transition-opacity group-hover:opacity-20`}
                        />

                        {/* Tool Header */}
                        <div className="flex flex-col items-center mb-4 relative z-10">
                            <div
                                className={`mb-4 p-5 rounded-2xl bg-linear-to-br ${COLOR_STYLES[tool.color]} shadow-sm border border-white/50 group-hover:scale-110 transition-transform duration-300`}
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
