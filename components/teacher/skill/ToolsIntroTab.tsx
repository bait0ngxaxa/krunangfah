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
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="mb-2 flex min-w-0 items-start gap-2 text-2xl font-bold text-emerald-700">
                        <Package
                            className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600"
                            aria-hidden="true"
                        />
                        <span className="break-words">
                            เครื่องมือใน Healthy Emotion Box
                        </span>
                    </h2>
                    <p className="max-w-3xl text-sm font-medium leading-6 text-gray-700 sm:text-base">
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
                        className={`relative flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 bg-white p-6 shadow-sm transition-base duration-300 hover:-translate-y-1 hover:shadow-md ${BORDER_STYLES[tool.color]}`}
                    >
                        {/* Tool Header */}
                        <div className="flex flex-col items-center mb-4 relative z-10">
                            <div
                                className={`mb-4 rounded-2xl p-5 shadow-sm transition-transform duration-300 ${COLOR_STYLES[tool.color]}`}
                            >
                                <tool.icon
                                    className="h-10 w-10 text-white"
                                    aria-hidden="true"
                                />
                            </div>
                            <h3 className="break-words text-center text-lg font-bold leading-7 text-gray-800">
                                {tool.name}
                            </h3>
                        </div>

                        {/* Tool Description */}
                        <p className="relative z-10 text-center text-sm leading-6 text-gray-700">
                            {tool.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
