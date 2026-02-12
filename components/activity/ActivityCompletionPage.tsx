"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, PartyPopper } from "lucide-react";
import { COLOR_CONFIG, ACTIVITY_NAMES } from "./ActivityWorkspace/constants";

interface ActivityCompletionPageProps {
    studentId: string;
    studentName: string;
    riskLevel: "orange" | "yellow" | "green";
    activityNumber: number;
    hasNextActivity?: boolean;
}

export function ActivityCompletionPage({
    studentId: _studentId,
    studentName,
    riskLevel,
    activityNumber,
    hasNextActivity = true,
}: ActivityCompletionPageProps) {
    const router = useRouter();
    const [thankYouVisible, setThankYouVisible] = useState(false);
    const [scheduleVisible, setScheduleVisible] = useState(false);
    const [finalButtonVisible, setFinalButtonVisible] = useState(false);

    const config = COLOR_CONFIG[riskLevel];
    const nextActivityNumber = activityNumber + 1;
    const nextActivityName = ACTIVITY_NAMES[nextActivityNumber];
    const currentActivityName = ACTIVITY_NAMES[activityNumber];

    // Animate elements
    useEffect(() => {
        setTimeout(() => setThankYouVisible(true), 500);
        setTimeout(() => setScheduleVisible(true), 1500);
        setTimeout(() => setFinalButtonVisible(true), 2500);
    }, []);

    const handleBackToDashboard = () => {
        router.push("/dashboard");
    };

    return (
        <div
            className={`min-h-screen ${config.bgLight} flex items-center justify-center py-12 px-4 bg-pattern-grid`}
        >
            <div className="max-w-2xl mx-auto text-center relative pointer-events-none">
                {/* Thank You Section */}
                <div
                    className={`transition-all duration-1000 ease-out pointer-events-auto ${
                        thankYouVisible
                            ? "opacity-100 translate-y-0 scale-100"
                            : "opacity-0 translate-y-8 scale-95"
                    }`}
                >
                    <div className="relative inline-block mb-8 group">
                        <div className="absolute inset-0 bg-white/50 rounded-full blur-2xl animate-pulse-slow" />
                        <div
                            className={`w-32 h-32 ${config.bg} rounded-3xl rotate-6 flex items-center justify-center text-white mx-auto shadow-2xl relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500 border-4 border-white/30`}
                        >
                            <PartyPopper className="w-16 h-16 animate-bounce-slow" />
                        </div>
                    </div>

                    <div className="bg-white/40 backdrop-blur-md rounded-3xl p-8 border border-white/60 shadow-xl mb-8">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 tracking-tight">
                            ขอบคุณที่ชวนเด็กทำ
                        </h1>
                        <p
                            className={`text-2xl md:text-3xl font-bold bg-linear-to-r ${config.gradient} bg-clip-text text-transparent`}
                        >
                            กิจกรรมที่ {activityNumber}: {currentActivityName}
                        </p>
                    </div>
                </div>

                {/* Schedule Section - Only show if there's a next activity */}
                {hasNextActivity && nextActivityName && (
                    <div
                        className={`mt-8 bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white pointer-events-auto hover:shadow-3xl transition-all duration-1000 ${
                            scheduleVisible
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 translate-y-8"
                        }`}
                    >
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 rotate-3">
                                <Calendar className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xl text-gray-600">
                                อีก{" "}
                                <span className="font-bold text-blue-600 text-2xl">
                                    1 สัปดาห์
                                </span>
                            </p>
                            <p className="text-xl text-gray-800">
                                มาชวนเด็กทำ
                                <span
                                    className={`block mt-2 font-bold text-2xl ${config.text}`}
                                >
                                    กิจกรรมที่ {nextActivityNumber}:{" "}
                                    {nextActivityName}
                                </span>
                                กันนะ
                            </p>
                        </div>
                    </div>
                )}

                {/* All activities completed message */}
                {!hasNextActivity && (
                    <div
                        className={`mt-8 bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white pointer-events-auto transition-all duration-1000 ${
                            scheduleVisible
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 translate-y-8"
                        }`}
                    >
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <PartyPopper className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-2xl text-gray-800 mb-2 font-bold">
                            <span className="text-green-600">ยินดีด้วย!</span>
                        </p>
                        <p className="text-xl text-gray-600">
                            ทำกิจกรรมครบทุกกิจกรรมแล้ว
                        </p>
                    </div>
                )}

                {/* Back to Dashboard Button */}
                <button
                    onClick={handleBackToDashboard}
                    className={`pointer-events-auto mt-12 inline-flex items-center gap-3 px-10 py-5 bg-linear-to-r ${config.gradient} text-white rounded-full font-bold text-xl shadow-lg hover:shadow-xl hover:shadow-pink-200/50 hover:-translate-y-1 hover:scale-105 transition-all duration-500 group relative overflow-hidden ${
                        finalButtonVisible
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-8"
                    }`}
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative">กลับหน้าหลัก</span>
                    <ArrowRight className="w-6 h-6 relative group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Student name */}
                <p
                    className={`mt-8 text-gray-500 font-medium transition-all duration-1000 ${
                        finalButtonVisible ? "opacity-100" : "opacity-0"
                    }`}
                >
                    สำหรับ:{" "}
                    <span className="text-gray-800 font-bold">
                        {studentName}
                    </span>
                </p>
            </div>
        </div>
    );
}
