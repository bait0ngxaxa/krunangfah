import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import type { ColorTheme } from "@/lib/config/help-page-config";
import { HelpPageHeader } from "./HelpPageHeader";

interface ConversationViewProps {
    studentName: string;
    studentId: string;
    riskLevel: RiskLevel;
    config: ColorTheme;
}

export function ConversationView({
    studentName,
    studentId,
    riskLevel: _riskLevel,
    config,
}: ConversationViewProps) {
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

                    <HelpPageHeader
                        studentName={studentName}
                        config={config}
                        icon="💬"
                        title="หลักการพูดคุยกับนักเรียน"
                    />

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
