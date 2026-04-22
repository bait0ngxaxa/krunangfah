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
    const continueButtonClass =
        riskLevel === "orange"
            ? "bg-orange-500 hover:bg-orange-600"
            : riskLevel === "yellow"
              ? "bg-yellow-400 hover:bg-yellow-500"
              : "bg-green-500 hover:bg-green-600";
    const mainMessages = getEncouragementMessages(problemType);
    const tipMessages = ENCOURAGEMENT_MESSAGES.tips;

    // Step 1 animations
    useEffect(() => {
        if (step !== 1) return;
        const timers: number[] = [];

        // Animate main messages one by one
        mainMessages.forEach((_, index) => {
            const timer = window.setTimeout(
                () => {
                    setVisibleLines((prev) => [...prev, index]);
                },
                800 * (index + 1),
            );
            timers.push(timer);
        });

        // Show tips section after main messages
        timers.push(
            window.setTimeout(
            () => {
                setShowTips(true);
            },
            800 * (mainMessages.length + 1),
            ),
        );

        // Animate tip messages
        tipMessages.forEach((_, index) => {
            const timer = window.setTimeout(
                () => {
                    setVisibleLines((prev) => [
                        ...prev,
                        mainMessages.length + index,
                    ]);
                },
                800 * (mainMessages.length + 2 + index),
            );
            timers.push(timer);
        });

        // Show continue button at the end
        timers.push(
            window.setTimeout(
            () => {
                setShowButton(true);
            },
            800 * (mainMessages.length + tipMessages.length + 3),
            ),
        );

        return () => {
            timers.forEach((timer) => window.clearTimeout(timer));
        };
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
            className={`min-h-screen ${config.bgLight} flex items-center justify-center px-4 py-12`}
        >
            <div className="max-w-2xl mx-auto text-center w-full">
                {/* Decorative icon */}
                <div
                    className={`mx-auto mb-10 flex h-28 w-28 items-center justify-center rounded-full ${config.bg} text-white shadow-sm`}
                >
                    <Heart className="w-14 h-14" />
                </div>

                {/* Main Messages */}
                <div className="space-y-6 mb-16 px-4">
                    {mainMessages.map((message, index) => (
                        <p
                            key={index}
                            className={`text-2xl md:text-4xl font-bold text-gray-800 transition-base duration-1000 leading-normal ${
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
                    className={`mx-4 mb-12 transform rounded-3xl border border-gray-200/80 bg-white/90 p-8 shadow-sm transition-base duration-1000 hover:scale-[1.02] md:p-10 ${
                        showTips
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-8"
                    }`}
                >
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                        </div>
                        <span className="text-xl font-bold text-amber-600">
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
                                className={`flex gap-4 items-start transition-base duration-1000 ${
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
                    className={`group relative inline-flex items-center gap-3 overflow-hidden rounded-full px-10 py-5 text-xl font-bold text-white shadow-sm transition-base duration-500 hover:-translate-y-1 hover:scale-105 hover:shadow-md ${continueButtonClass} ${
                        showButton
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-8"
                    }`}
                >
                    <span className="relative">ถัดไป</span>
                    <ArrowRight className="w-6 h-6 relative group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
}
