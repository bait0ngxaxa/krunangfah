/**
 * Tools Introduction Tab
 * แท็บสำหรับแนะนำเครื่องมือใน Healthy Emotion Box
 */

import {
    HEALTHY_EMOTION_TOOLS,
    COLOR_STYLES,
    BORDER_STYLES,
} from "@/constants/healthyEmotionTools";

export function ToolsIntroTab() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-linear-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    🧰 เครื่องมือใน Healthy Emotion Box
                </h2>
                <p className="text-gray-600">
                    ระบบเครื่องมือครบวงจร 9 ชิ้น สำหรับการดูแลสุขภาพจิตนักเรียน
                </p>
            </div>

            {/* Tools Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {HEALTHY_EMOTION_TOOLS.map((tool) => (
                    <div
                        key={tool.id}
                        className={`bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border-2 ${BORDER_STYLES[tool.color]} hover:scale-105`}
                    >
                        {/* Tool Header */}
                        <div className="flex flex-col items-center mb-4">
                            <div
                                className={`text-5xl mb-3 p-4 rounded-xl bg-linear-to-br ${COLOR_STYLES[tool.color]} bg-opacity-10`}
                            >
                                {tool.icon}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 text-center leading-tight">
                                {tool.name}
                            </h3>
                        </div>

                        {/* Tool Description */}
                        <p className="text-sm text-gray-600 text-center leading-relaxed">
                            {tool.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
