"use client";

import { useEffect, useState } from "react";
import { Heart, Sparkles, ArrowRight } from "lucide-react";
import { ActivityCompletionPage } from "./ActivityCompletionPage";
import {
    COLOR_CONFIG,
    ENCOURAGEMENT_MESSAGES,
} from "./ActivityWorkspace/constants";

interface EncouragementPageProps {
    studentId: string;
    studentName: string;
    problemType: "internal" | "external";
    riskLevel: "orange" | "yellow" | "green";
    activityNumber: number;
    hasNextActivity?: boolean;
}

export function EncouragementPage({
    studentId,
    studentName,
    problemType,
    riskLevel,
    activityNumber,
    hasNextActivity = true,
}: EncouragementPageProps) {
    // กิจกรรม 2+ ข้าม encouragement messages ไปแสดง completion page เลย
    const initialStep = activityNumber === 1 ? 1 : 2;
    const [step, setStep] = useState<1 | 2>(initialStep);
    const [visibleLines, setVisibleLines] = useState<number[]>([]);
    const [showTips, setShowTips] = useState(false);
    const [showButton, setShowButton] = useState(false);

    const config = COLOR_CONFIG[riskLevel];
    const mainMessages = ENCOURAGEMENT_MESSAGES[problemType];
    const tipMessages = ENCOURAGEMENT_MESSAGES.tips;

    // Step 1 animations
    useEffect(() => {
        if (step !== 1) return;

        // Animate main messages one by one
        mainMessages.forEach((_, index) => {
            setTimeout(
                () => {
                    setVisibleLines((prev) => [...prev, index]);
                },
                800 * (index + 1),
            );
        });

        // Show tips section after main messages
        setTimeout(
            () => {
                setShowTips(true);
            },
            800 * (mainMessages.length + 1),
        );

        // Animate tip messages
        tipMessages.forEach((_, index) => {
            setTimeout(
                () => {
                    setVisibleLines((prev) => [
                        ...prev,
                        mainMessages.length + index,
                    ]);
                },
                800 * (mainMessages.length + 2 + index),
            );
        });

        // Show continue button at the end
        setTimeout(
            () => {
                setShowButton(true);
            },
            800 * (mainMessages.length + tipMessages.length + 3),
        );
    }, [step, mainMessages, tipMessages]);

    const handleContinue = () => {
        setStep(2);
    };

    // Step 2: Use shared ActivityCompletionPage
    if (step === 2) {
        return (
            <ActivityCompletionPage
                studentId={studentId}
                studentName={studentName}
                riskLevel={riskLevel}
                activityNumber={activityNumber}
                hasNextActivity={hasNextActivity}
            />
        );
    }

    // Step 1: Encouragement messages
    return (
        <div
            className={`min-h-screen ${config.bgLight} flex items-center justify-center py-12 px-4`}
        >
            <div className="max-w-2xl mx-auto text-center">
                {/* Decorative icon */}
                <div
                    className={`w-24 h-24 ${config.bg} rounded-full flex items-center justify-center text-white mx-auto mb-8 animate-pulse`}
                >
                    <Heart className="w-12 h-12" />
                </div>

                {/* Main Messages */}
                <div className="space-y-4 mb-12">
                    {mainMessages.map((message, index) => (
                        <p
                            key={index}
                            className={`text-2xl md:text-3xl font-bold text-gray-800 transition-all duration-1000 ${
                                visibleLines.includes(index)
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 translate-y-4"
                            }`}
                        >
                            {message}
                        </p>
                    ))}
                </div>

                {/* Tips Section */}
                <div
                    className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg mb-8 transition-all duration-1000 ${
                        showTips
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-4"
                    }`}
                >
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        <span className="text-amber-600 font-bold">
                            คำแนะนำสำหรับคุณครู
                        </span>
                        <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="space-y-3">
                        {tipMessages.map((message, index) => (
                            <p
                                key={index}
                                className={`text-gray-700 text-lg transition-all duration-1000 ${
                                    visibleLines.includes(
                                        mainMessages.length + index,
                                    )
                                        ? "opacity-100 translate-y-0"
                                        : "opacity-0 translate-y-4"
                                }`}
                            >
                                {message}
                            </p>
                        ))}
                    </div>
                </div>

                {/* Continue Button */}
                <button
                    onClick={handleContinue}
                    className={`inline-flex items-center gap-3 px-8 py-4 bg-linear-to-r ${config.gradient} text-white rounded-full font-bold text-lg shadow-lg hover:opacity-90 transition-all duration-1000 ${
                        showButton
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-4"
                    }`}
                >
                    ถัดไป
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
