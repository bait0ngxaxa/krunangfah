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
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-8 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-10 right-10 w-64 h-64 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow" />
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow delay-1000" />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Back Button */}
                <Link
                    href={`/students/${studentId}`}
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-bold transition-all hover:bg-white/80 hover:shadow-sm px-4 py-2 rounded-xl backdrop-blur-sm border border-transparent hover:border-pink-200 mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>กลับหน้าข้อมูลนักเรียน</span>
                </Link>

                <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-100/50 p-6 md:p-8 border border-pink-100 relative overflow-hidden animate-fade-in-up">
                    <div
                        className={`absolute top-0 left-0 w-full h-1.5 bg-linear-to-r ${config.gradient}`}
                    />

                    <HelpPageHeader
                        studentName={studentName}
                        config={config}
                        icon="💬"
                        title="หลักการพูดคุยกับนักเรียน"
                    />

                    {/* Content */}
                    <div className="bg-white/60 rounded-2xl p-8 mb-8 border border-pink-50/50 shadow-sm">
                        <h2 className="text-xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                            <span className="text-2xl">📋</span>
                            แนวทางการช่วยเหลือ
                        </h2>
                        <ul className="space-y-4 text-gray-700">
                            <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-pink-100">
                                <span className="text-2xl filter drop-shadow-sm">
                                    🤝
                                </span>
                                <span className="font-medium text-lg">
                                    สร้างความสัมพันธ์ที่ดีและความไว้วางใจกับนักเรียน
                                </span>
                            </li>
                            <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-pink-100">
                                <span className="text-2xl filter drop-shadow-sm">
                                    👂
                                </span>
                                <span className="font-medium text-lg">
                                    รับฟังด้วยความเข้าใจ
                                    ไม่ตัดสินหรือวิพากษ์วิจารณ์
                                </span>
                            </li>
                            <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-pink-100">
                                <span className="text-2xl filter drop-shadow-sm">
                                    💡
                                </span>
                                <span className="font-medium text-lg">
                                    ให้ข้อมูลและทางเลือกที่เหมาะสม
                                    ไม่บังคับให้ตัดสินใจ
                                </span>
                            </li>
                            <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-pink-100">
                                <span className="text-2xl filter drop-shadow-sm">
                                    🏥
                                </span>
                                <span className="font-medium text-lg">
                                    ประสานงานกับผู้เชี่ยวชาญด้านสุขภาพจิตเมื่อจำเป็น
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Conversation Guide Button */}
                    <Link
                        href={`/students/${studentId}/help/conversation`}
                        className={`block w-full py-4 bg-linear-to-r ${config.gradient} text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all text-center text-lg shadow-md flex items-center justify-center gap-2 group`}
                    >
                        <span className="group-hover:scale-110 transition-transform">
                            💬
                        </span>
                        ดูหลักการพูดคุย
                    </Link>
                </div>
            </div>
        </div>
    );
}
