import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getStudentDetail } from "@/lib/actions/student.actions";
import type { RiskLevel } from "@/lib/utils/phq-scoring";

// Activity configuration
const ACTIVITIES = [
    {
        id: "a1",
        title: "กิจกรรมที่ 1: รู้จักตัวเอง",
        description: "ใบงาน 2 ใบ",
        worksheets: ["/activity/a1/act1-1.jpg", "/activity/a1/act1-2.jpg"],
    },
    {
        id: "a2",
        title: "กิจกรรมที่ 2: ค้นหาคุณค่าที่ฉันมี",
        description: "ใบงาน 2 ใบ",
        worksheets: ["/activity/a2/act2-1.jpg", "/activity/a2/act2-2.jpg"],
    },
    {
        id: "a3",
        title: "กิจกรรมที่ 3: ปรับความคิด ชีวิตเปลี่ยน",
        description: "ใบงาน 2 ใบ",
        worksheets: ["/activity/a3/act3-1.jpg", "/activity/a3/act3-2.jpg"],
    },
    {
        id: "a4",
        title: "กิจกรรมที่ 4: รู้จักตัวกระตุ้น",
        description: "ใบงาน 2 ใบ",
        worksheets: ["/activity/a4/act4-1.jpg", "/activity/a4/act4-2.jpg"],
    },
    {
        id: "a5",
        title: "กิจกรรมที่ 5: ตามติดเพื่อไปต่อ",
        description: "ใบงาน 1 ใบ",
        worksheets: ["/activity/a5/act5.jpg"],
    },
];

// Activity indices per risk level (0-indexed)
const ACTIVITY_INDICES: Record<string, number[]> = {
    orange: [0, 1, 2, 3, 4], // กิจกรรม 1, 2, 3, 4, 5
    yellow: [0, 1, 2, 4], // กิจกรรม 1, 2, 3, 5
    green: [0, 1, 4], // กิจกรรม 1, 2, 5
};

const COLOR_CONFIG: Record<
    string,
    { gradient: string; bg: string; text: string; lightBg: string }
> = {
    orange: {
        gradient: "from-orange-500 to-amber-500",
        bg: "bg-orange-500",
        text: "สีส้ม",
        lightBg: "bg-orange-50",
    },
    yellow: {
        gradient: "from-yellow-400 to-amber-400",
        bg: "bg-yellow-400",
        text: "สีเหลือง",
        lightBg: "bg-yellow-50",
    },
    green: {
        gradient: "from-green-500 to-emerald-500",
        bg: "bg-green-500",
        text: "สีเขียว",
        lightBg: "bg-green-50",
    },
    red: {
        gradient: "from-red-500 to-rose-500",
        bg: "bg-red-500",
        text: "สีแดง",
        lightBg: "bg-red-50",
    },
    blue: {
        gradient: "from-blue-500 to-cyan-500",
        bg: "bg-blue-500",
        text: "สีน้ำเงิน",
        lightBg: "bg-blue-50",
    },
};

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function StudentHelpPage({ params }: PageProps) {
    const { id: studentId } = await params;

    const student = await getStudentDetail(studentId);

    if (!student) {
        notFound();
    }

    const latestResult = student.phqResults[0];
    if (!latestResult) {
        redirect(`/students/${studentId}`);
    }

    const riskLevel = latestResult.riskLevel as RiskLevel;
    const config = COLOR_CONFIG[riskLevel] || COLOR_CONFIG.green;

    // Red and Blue - Conversation only
    if (riskLevel === "red" || riskLevel === "blue") {
        return (
            <ConversationOnlyPage
                student={{
                    firstName: student.firstName,
                    lastName: student.lastName,
                    riskLevel,
                }}
                studentId={studentId}
                config={config}
            />
        );
    }

    // Orange, Yellow, Green - Always show worksheet introduction
    const activityIndices = ACTIVITY_INDICES[riskLevel] || [0, 1, 4];
    const activities = activityIndices.map((index) => ACTIVITIES[index]);
    const activityCount = activities.length;

    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Back Button */}
                <Link
                    href={`/students/${studentId}`}
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-pink-50 px-4 py-2 rounded-full mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>กลับหน้าข้อมูลนักเรียน</span>
                </Link>

                <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 w-full h-2 bg-linear-to-r ${config.gradient}`}
                    />

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div
                            className={`w-20 h-20 ${config.bg} rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4`}
                        >
                            📋
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                            ระบบใบงานช่วยเหลือนักเรียน
                        </h1>
                        <p className="text-gray-600">
                            {student.firstName} {student.lastName} •{" "}
                            {config.text}
                        </p>
                    </div>

                    {/* Activity Count Badge */}
                    <div className="flex justify-center mb-8">
                        <div
                            className={`inline-flex items-center gap-2 px-6 py-3 ${config.lightBg} rounded-full`}
                        >
                            <span className="text-lg font-bold text-gray-800">
                                🎯 ต้องทำทั้งหมด {activityCount} กิจกรรม
                            </span>
                        </div>
                    </div>

                    {/* Activity Cards - 2 per row for better visibility */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {activities.map((activity, index) => (
                            <div
                                key={activity.id}
                                className="bg-gray-50 rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div
                                        className={`w-14 h-14 ${config.bg} rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg`}
                                    >
                                        {index + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xl font-bold text-gray-800">
                                            {activity.title}
                                        </h3>
                                        <p className="text-gray-500">
                                            {activity.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Worksheet previews - Large horizontal layout */}
                                <div className="flex flex-row gap-4 justify-center">
                                    {activity.worksheets.map(
                                        (worksheet, wIndex) => (
                                            <div
                                                key={wIndex}
                                                className="w-44 h-60 bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200 relative transform hover:scale-105 transition-transform"
                                            >
                                                <Image
                                                    src={worksheet}
                                                    alt={`${activity.title} ใบงาน ${wIndex + 1}`}
                                                    fill
                                                    className="object-contain p-1"
                                                />
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href={`/students/${studentId}/help/start`}
                            className={`flex items-center justify-center gap-2 py-4 px-8 bg-linear-to-r ${config.gradient} text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-lg shadow-lg`}
                        >
                            🚀 เริ่มทำกิจกรรม
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Conversation-only page for red/blue risk levels
function ConversationOnlyPage({
    student,
    studentId,
    config,
}: {
    student: { firstName: string; lastName: string; riskLevel: RiskLevel };
    studentId: string;
    config: { gradient: string; bg: string; text: string; lightBg: string };
}) {
    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <Link
                    href={`/students/${studentId}`}
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-pink-50 px-4 py-2 rounded-full mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>กลับหน้าข้อมูลนักเรียน</span>
                </Link>

                <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 w-full h-2 bg-linear-to-r ${config.gradient}`}
                    />

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div
                            className={`w-20 h-20 ${config.bg} rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4`}
                        >
                            💬
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                            หลักการพูดคุยกับนักเรียน
                        </h1>
                        <p className="text-gray-600">
                            {student.firstName} {student.lastName} •{" "}
                            {config.text}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">
                            แนวทางการช่วยเหลือ
                        </h2>
                        <ul className="space-y-3 text-gray-700">
                            <li className="flex items-start gap-3">
                                <span className="text-xl">🤝</span>
                                <span>
                                    สร้างความสัมพันธ์ที่ดีและความไว้วางใจกับนักเรียน
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-xl">👂</span>
                                <span>
                                    รับฟังด้วยความเข้าใจ
                                    ไม่ตัดสินหรือวิพากษ์วิจารณ์
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-xl">💡</span>
                                <span>
                                    ให้ข้อมูลและทางเลือกที่เหมาะสม
                                    ไม่บังคับให้ตัดสินใจ
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-xl">🏥</span>
                                <span>
                                    ประสานงานกับผู้เชี่ยวชาญด้านสุขภาพจิตเมื่อจำเป็น
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Conversation Guide Button */}
                    <Link
                        href={`/students/${studentId}/help/conversation`}
                        className={`block w-full py-4 bg-linear-to-r ${config.gradient} text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-center text-lg`}
                    >
                        💬 ดูหลักการพูดคุย
                    </Link>
                </div>
            </div>
        </div>
    );
}
