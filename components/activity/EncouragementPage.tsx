"use client";

import { useEffect, useState } from "react";
import { Heart, Sparkles, ArrowRight } from "lucide-react";
import { ActivityCompletionPage } from "./ActivityCompletionPage";
import {
    getWorkspaceColorConfig,
    getEncouragementMessages,
    ENCOURAGEMENT_MESSAGES,
} from "./ActivityWorkspace/constants";

interface EncouragementPageProps {
    studentId: string;
    studentName: string;
    problemType: "internal" | "external";
    riskLevel: "orange" | "yellow" | "green";
    activityNumber: number;
    assessmentPeriodLabel?: string;
}

export function EncouragementPage({
    studentId,
    studentName,
    problemType,
    riskLevel,
    activityNumber,
    assessmentPeriodLabel,
}: EncouragementPageProps) {
    // กิจกรรม 2+ ข้าม encouragement messages ไปแสดง completion page เลย
    const initialStep = activityNumber === 1 ? 1 : 2;
    const [step, setStep] = useState<1 | 2>(initialStep);
    const [visibleLines, setVisibleLines] = useState<number[]>([]);
    const [showTips, setShowTips] = useState(false);
    const [showButton, setShowButton] = useState(false);

    const config = getWorkspaceColorConfig(riskLevel);
    const mainMessages = getEncouragementMessages(problemType);
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
                assessmentPeriodLabel={assessmentPeriodLabel}
            />
        );
    }

    // Step 1: Encouragement messages

    return (
        <div
            className={`min-h-screen ${config.bgLight} flex items-center justify-center py-12 px-4 bg-pattern-grid`}
        >
            <div className="max-w-2xl mx-auto text-center w-full">
                {/* Decorative icon */}
                <div
                    className={`w-28 h-28 ${config.bg} rounded-full flex items-center justify-center text-white mx-auto mb-10 animate-pulse shadow-xl shadow-emerald-100`}
                >
                    <Heart className="w-14 h-14" />
                </div>

                {/* Main Messages */}
                <div className="space-y-6 mb-16 px-4">
                    {mainMessages.map((message, index) => (
                        <p
                            key={index}
                            className={`text-2xl md:text-4xl font-bold text-gray-800 transition-all duration-1000 leading-normal ${
                                visibleLines.includes(index)
                                    ? "opacity-100 translate-y-0 blur-0"
                                    : "opacity-0 translate-y-8 blur-sm"
                            }`}
                        >
                            {message}
                        </p>
                    ))}
                </div>

                {/* Tips Section */}
                <div
                    className={`bg-white/70 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-2xl border border-emerald-200 mb-12 transition-all duration-1000 mx-4 transform hover:scale-[1.02] ${
                        showTips
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-8"
                    }`}
                >
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                        </div>
                        <span className="text-xl font-bold bg-linear-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                            คำแนะนำสำหรับคุณครู
                        </span>
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                        </div>
                    </div>
                    <div className="space-y-6 text-left relative">
                        {/* Decorative quote marks */}
                        <div className="absolute -top-4 -left-2 text-6xl text-amber-200 opacity-50 font-serif">
                            &ldquo;
                        </div>
                        <div className="absolute -bottom-8 -right-2 text-6xl text-amber-200 opacity-50 font-serif rotate-180">
                            &rdquo;
                        </div>

                        {tipMessages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex gap-4 items-start transition-all duration-1000 ${
                                    visibleLines.includes(
                                        mainMessages.length + index,
                                    )
                                        ? "opacity-100 translate-x-0"
                                        : "opacity-0 -translate-x-4"
                                }`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5 shrink-0" />
                                <p className="text-gray-700 text-lg md:text-xl font-medium leading-relaxed">
                                    {message}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Continue Button */}
                <button
                    onClick={handleContinue}
                    className={`inline-flex items-center gap-3 px-10 py-5 bg-linear-to-r ${config.gradient} text-white rounded-full font-bold text-xl shadow-lg hover:shadow-xl hover:shadow-emerald-200/50 hover:-translate-y-1 hover:scale-105 transition-all duration-500 group relative overflow-hidden ${
                        showButton
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-8"
                    }`}
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative">ถัดไป</span>
                    <ArrowRight className="w-6 h-6 relative group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
}
