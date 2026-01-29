"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function GuidelinesPage() {
    const params = useParams();
    const studentId = params.id as string;

    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <Link
                    href={`/students/${studentId}/help/start`}
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-pink-50 px-4 py-2 rounded-full mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>กลับหน้าใบงาน</span>
                </Link>

                <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-purple-500 to-pink-500" />

                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                                หลักการใช้ใบงาน
                            </h1>
                            <p className="text-gray-600">
                                คำแนะนำในการทำกิจกรรม
                            </p>
                        </div>
                    </div>

                    {/* Content Placeholder */}
                    <div className="prose prose-lg max-w-none">
                        <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-xl mb-6">
                            <h3 className="text-purple-800 font-bold mb-2">
                                📌 หมายเหตุ
                            </h3>
                            <p className="text-purple-700 mb-0">
                                เนื้อหาหลักการใช้ใบงานจะถูกเพิ่มในภายหลัง
                            </p>
                        </div>

                        <h2 className="text-xl font-bold text-gray-800 mb-4">
                            วิธีการใช้ใบงาน
                        </h2>
                        <ol className="space-y-3 text-gray-700">
                            <li>อ่านคำแนะนำในแต่ละกิจกรรมอย่างละเอียด</li>
                            <li>ทำใบงานตามลำดับที่กำหนด</li>
                            <li>ใช้เวลาคิดและสำรวจตัวเองอย่างจริงจัง</li>
                            <li>ปรึกษาครูหากมีข้อสงสัย</li>
                        </ol>
                    </div>

                    {/* Back Button */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <Link
                            href={`/students/${studentId}/help/start`}
                            className="block w-full py-3 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-center"
                        >
                            กลับหน้าใบงาน
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
