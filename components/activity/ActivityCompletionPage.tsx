"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, PartyPopper } from "lucide-react";

interface ActivityCompletionPageProps {
    studentId: string;
    studentName: string;
    riskLevel: "orange" | "yellow" | "green";
    activityNumber: number;
    hasNextActivity?: boolean;
}

const COLOR_CONFIG: Record<
    string,
    { gradient: string; bg: string; bgLight: string }
> = {
    orange: {
        gradient: "from-orange-500 to-amber-500",
        bg: "bg-orange-500",
        bgLight: "bg-orange-50",
    },
    yellow: {
        gradient: "from-yellow-400 to-amber-400",
        bg: "bg-yellow-400",
        bgLight: "bg-yellow-50",
    },
    green: {
        gradient: "from-green-500 to-emerald-500",
        bg: "bg-green-500",
        bgLight: "bg-green-50",
    },
};

const ACTIVITY_NAMES: Record<number, string> = {
    1: "รู้จักตัวเอง",
    2: "ค้นหาคุณค่าที่ฉันมี",
    3: "ปรับความคิด ชีวิตเปลี่ยน",
    4: "รู้จักตัวกระตุ้น",
    5: "ตามติดเพื่อไปต่อ",
};

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
            className={`min-h-screen ${config.bgLight} flex items-center justify-center py-12 px-4`}
        >
            <div className="max-w-2xl mx-auto text-center">
                {/* Thank You Section */}
                <div
                    className={`transition-all duration-1000 ${
                        thankYouVisible
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-4"
                    }`}
                >
                    <div
                        className={`w-24 h-24 ${config.bg} rounded-full flex items-center justify-center text-white mx-auto mb-6`}
                    >
                        <PartyPopper className="w-12 h-12" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                        ขอบคุณที่ชวนเด็กทำ
                    </h1>
                    <p className="text-2xl md:text-3xl font-bold text-gray-600">
                        กิจกรรมที่ {activityNumber}: {currentActivityName}
                    </p>
                </div>

                {/* Schedule Section - Only show if there's a next activity */}
                {hasNextActivity && nextActivityName && (
                    <div
                        className={`mt-12 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg transition-all duration-1000 ${
                            scheduleVisible
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 translate-y-4"
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <Calendar className="w-6 h-6 text-blue-500" />
                        </div>
                        <p className="text-xl text-gray-700 mb-2">
                            อีก{" "}
                            <span className="font-bold text-blue-600">
                                1 สัปดาห์
                            </span>
                        </p>
                        <p className="text-xl text-gray-700">
                            มาชวนเด็กทำ
                            <span className="font-bold">
                                กิจกรรมที่ {nextActivityNumber}:{" "}
                                {nextActivityName}
                            </span>{" "}
                            กันนะ
                        </p>
                    </div>
                )}

                {/* All activities completed message */}
                {!hasNextActivity && (
                    <div
                        className={`mt-12 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg transition-all duration-1000 ${
                            scheduleVisible
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 translate-y-4"
                        }`}
                    >
                        <p className="text-xl text-gray-700 mb-2">
                            🎉{" "}
                            <span className="font-bold text-green-600">
                                ยินดีด้วย!
                            </span>
                        </p>
                        <p className="text-xl text-gray-700">
                            ทำกิจกรรมครบทุกกิจกรรมแล้ว
                        </p>
                    </div>
                )}

                {/* Back to Dashboard Button */}
                <button
                    onClick={handleBackToDashboard}
                    className={`mt-10 inline-flex items-center gap-3 px-8 py-4 bg-linear-to-r ${config.gradient} text-white rounded-full font-bold text-lg shadow-lg hover:opacity-90 transition-all duration-1000 ${
                        finalButtonVisible
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-4"
                    }`}
                >
                    กลับหน้าหลัก
                    <ArrowRight className="w-5 h-5" />
                </button>

                {/* Student name */}
                <p
                    className={`mt-6 text-gray-500 transition-all duration-1000 ${
                        finalButtonVisible ? "opacity-100" : "opacity-0"
                    }`}
                >
                    สำหรับ: {studentName}
                </p>
            </div>
        </div>
    );
}
